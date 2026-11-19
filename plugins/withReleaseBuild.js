// Release signing from keystore/keystore.properties, arm64-v8a only, R8 keep rules, and no OpenCL llama.rn library.
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// withReleaseBuild: signing key';

const LOAD_KEY = `${MARKER}
def releaseKeyDir = rootProject.file('../keystore')
def releaseKeyProps = new Properties()
def releaseKeyFile = new File(releaseKeyDir, 'keystore.properties')
if (releaseKeyFile.exists()) {
    releaseKeyFile.withInputStream { releaseKeyProps.load(it) }
}

android {`;

// No key: debug builds still work, and a release build fails instead of using the debug key.
const RELEASE_CONFIG = `signingConfigs {
        release {
            if (releaseKeyFile.exists()) {
                storeFile new File(releaseKeyDir, releaseKeyProps['storeFile'])
                storePassword releaseKeyProps['storePassword']
                keyAlias releaseKeyProps['keyAlias']
                keyPassword releaseKeyProps['keyPassword']
            }
        }`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes(MARKER)) {
      return config;
    }
    const steps = [
      [/^android \{/m, LOAD_KEY],
      [/signingConfigs \{/, RELEASE_CONFIG],
      [/(release \{[^}]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release'],
      // OpenCL is off; without this library llama.rn falls back to its tested CPU build on Snapdragon phones.
      [/jniLibs \{\n/, `jniLibs {\n            excludes += ['**/librnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl.so', '**/librnllama_v8_2_dotprod_i8mm_hexagon_opencl.so']\n`],
    ];
    for (const [pattern, replacement] of steps) {
      if (!pattern.test(gradle)) {
        throw new Error(`withReleaseBuild: ${pattern} not found in app/build.gradle`);
      }
      gradle = gradle.replace(pattern, replacement);
    }
    config.modResults.contents = gradle;
    return config;
  });
}

function withArm64Only(config) {
  return withGradleProperties(config, (config) => {
    const item = config.modResults.find((entry) => entry.type === 'property' && entry.key === 'reactNativeArchitectures');
    if (item) {
      item.value = 'arm64-v8a';
    } else {
      config.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    }
    return config;
  });
}

const KEEP_MARKER = '# withReleaseBuild: ML Kit';

// ML Kit's native OCR finds its Java classes by name; R8 renaming them gave a NullPointerException on receipts.
const KEEP_RULES = `
${KEEP_MARKER}
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
`;

function withKeepRules(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const rules = fs.readFileSync(file, 'utf8');
      if (!rules.includes(KEEP_MARKER)) {
        fs.writeFileSync(file, rules + KEEP_RULES);
      }
      return config;
    },
  ]);
}

module.exports = function withReleaseBuild(config) {
  return withKeepRules(withArm64Only(withReleaseSigning(config)));
};
