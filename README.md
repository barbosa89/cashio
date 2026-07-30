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
