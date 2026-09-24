# Cash IO

> Your money. Your data. Always with you.

Cash IO is a offline-first personal finance app for Android, iOS, and web. It helps you track income and expenses, manage accounts, plan budgets, review monthly balances, explore charts, and export CSV reports — all from a local database on your device.

[cashio.omarbarbosa.com](https://cashio.omarbarbosa.com/en/) · [Google Play](https://play.google.com/store/apps/details?id=com.omarbarbosa.cashio)

## Privacy

Cash IO stores all data locally in a SQLite database on your device. It does not operate its own server, does not sell personal data, and does not use your records for advertising or analytics. Optional backups to Google Drive (Android) or iCloud (iOS) are user-controlled.

---

## Development

### Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

### Commands

```bash
npm install
npm run start
npm run android
npm run ios
npm run web
npx tsc --noEmit
```

Native backup libraries require a development/native build; Expo Go is insufficient.

### EAS builds

This project uses [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/) for cloud builds. Install the CLI and authenticate before creating a build:

```bash
npm install --global eas-cli
eas login
eas whoami
```

The build profiles are defined in `eas.json`:

| Profile | Purpose | Distribution |
| --- | --- | --- |
| `development` | Development client for testing native functionality | Internal |
| `preview` | Installable preview; Android produces an APK | Internal |
| `production` | Store release; Android produces an AAB | App Store / Google Play |

Create development builds:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

Create preview builds:

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

Create production builds for one or both platforms:

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
eas build --profile production --platform all
```

Submit the latest production build to the stores:

```bash
eas submit --profile production --platform android --latest
eas submit --profile production --platform ios --latest
```

The Android `internal` submit profile publishes to the Google Play internal track:

```bash
eas submit --profile internal --platform android --latest
```

EAS manages production build numbers remotely and increments them automatically according to `eas.json`. Store credentials are also managed remotely.

### Temporary Metro patch

Expo SDK 56 contains a known `@expo/metro-config` regression that can produce this error when `expo-sqlite` creates its web worker in development:

```text
Worker chunk not found for: node_modules/expo-sqlite/web/worker.ts
```

The project applies Expo's upstream fix from [expo/expo#50244](https://github.com/expo/expo/pull/50244) through `patch-package`. The `postinstall` script applies `patches/@expo+metro-config+56.0.19.patch` automatically after `npm install`.

Do not update `@expo/metro-config` independently to a different Expo SDK version. Once the fix is included in a compatible stable Expo release, upgrade the Expo dependencies together with `npx expo install --fix`, verify web and native builds, and then remove the patch, the `postinstall` script, and the `patch-package` dependency.
