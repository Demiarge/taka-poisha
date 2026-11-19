# Taka Poisha

An Android app for tracking money in Bangladeshi taka. Type a note the way you'd say it ("possu kacchi 350", "got salary 55000") or photograph a receipt, and a small AI model that runs on the phone fills in the amount, item, shop, category and date. Nothing leaves the phone unless you choose to send a receipt to an online reader with your own API key.

- Home: this month's income, spending and what's left
- History: expense and income charts by category, with colours you can pick
- Export to Excel and import from Excel (one sheet per month, plus a summary)
- Light theme and an AMOLED black dark theme

## Licence

- **Code:** MIT. See [LICENSE](LICENSE).
- **Models:** under their own terms, not the MIT License. They are not included in this repository or its releases.
  - `taka-poisha-gemma-270m-q5-mix.gguf` is a modified Gemma 3 270M IT, fine-tuned to read transactions and receipts. Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms. The [Prohibited Use Policy](https://ai.google.dev/gemma/prohibited_use_policy) applies to anyone who uses or shares it.
  - `all-MiniLM-L6-v2-Q8_0.gguf` (category matching) is Apache-2.0.
- Other libraries keep their own licences, listed in the app under Settings > About > Licences.

## Building

The app is built locally with Gradle (Android only, Windows tested).

1. Install Node.js, Android Studio (SDK and NDK) and a JDK.
2. Run `npm install`.
3. Supply the models yourself: they are not included. Put both files in `models/` with exactly these names and sizes (checked by `plugins/withBundledModels.js`; the build stops if one is missing or the wrong size):
   - `taka-poisha-gemma-270m-q5-mix.gguf`: 176,140,672 bytes
   - `all-MiniLM-L6-v2-Q8_0.gguf`: 25,008,064 bytes
4. Build:

```bash
npx expo-doctor
npx expo prebuild --platform android
cd android && ./gradlew.bat assembleDebug     # dev build
cd android && ./gradlew.bat assembleRelease   # release build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

A dev build loads its code from Metro (`npx expo start`). A release build needs your own signing key in `keystore/`.
