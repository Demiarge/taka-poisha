// Copies the .gguf models from models/ and NOTICE.txt into the APK's assets at prebuild, models stored uncompressed.
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const MODELS = require('../src/constants/bundledModels.json');
const ASSET_DIR = 'models';

function withModelAssets(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const source = path.join(config.modRequest.projectRoot, 'models');
      const target = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', ASSET_DIR);
      fs.mkdirSync(target, { recursive: true });
      for (const { file, bytes } of MODELS) {
        const from = path.join(source, file);
        // Fail the build rather than ship an APK without its models.
        if (!fs.existsSync(from)) {
          throw new Error(`withBundledModels: ${from} is missing`);
        }
        const size = fs.statSync(from).size;
        if (size !== bytes) {
          throw new Error(`withBundledModels: ${file} is ${size} bytes, expected ${bytes}`);
        }
        const to = path.join(target, file);
        if (!fs.existsSync(to) || fs.statSync(to).size !== bytes) {
          fs.copyFileSync(from, to);
        }
      }
      // Gemma Terms 3.1: a Notice file must ship with the model.
      const notice = path.join(config.modRequest.projectRoot, 'NOTICE.txt');
      if (!fs.existsSync(notice)) {
        throw new Error(`withBundledModels: ${notice} is missing`);
      }
      fs.copyFileSync(notice, path.join(target, 'NOTICE.txt'));
      return config;
    },
  ]);
}

function withNoCompress(config) {
  return withAppBuildGradle(config, (config) => {
    const line = "        noCompress 'gguf'";
    if (!config.modResults.contents.includes(line)) {
      const anchor = /androidResources \{\n/;
      if (!anchor.test(config.modResults.contents)) {
        throw new Error('withBundledModels: androidResources block not found in app/build.gradle');
      }
      config.modResults.contents = config.modResults.contents.replace(anchor, (match) => `${match}${line}\n`);
    }
    return config;
  });
}

module.exports = function withBundledModels(config) {
  return withNoCompress(withModelAssets(config));
};
