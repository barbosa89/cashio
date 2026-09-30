# Cash IO Agent Guide

## Sources Of Truth

- Read `PRODUCT.md` before changing capabilities or privacy claims and `DESIGN.md` before UI work.
- `ARCHITECTURE.md` documents runtime composition and data flows; executable code wins if it
  becomes stale.
- `README.md` contains build setup and the removal procedure for the temporary Metro patch.

## Commands

```bash
npm install                                      # also applies patches/ via postinstall
npm run start                                    # Expo dev server
npm run android                                  # native Android development build
npm run ios                                      # native iOS development build
npm run web                                      # web dev server
npm test -- --runTestsByPath __tests__/FILE.ts   # one test file
npm test                                         # all Jest tests, serially
npm run lint                                     # expo lint
npx tsc --noEmit                                 # strict typecheck
```

Use a development/native build for backup and other native-module work; Expo Go is insufficient.

## Architecture Boundaries

- Expo Router uses typed routes under `src/app/`. Keep route wrappers small; substantial screens
  belong in `src/components/`.
- `src/app/_layout.tsx` composes localization, theme, the restore gate, `SQLiteProvider`, calendar
  notifications, and drawer navigation. Database consumers must remain below `SQLiteProvider`.
- Put SQLite access and business validation in repositories under `src/lib/`. Hooks in `src/hooks/`
  coordinate repositories and UI refreshes; components should not issue SQL.
- `src/lib/database.ts` owns schema types and sequential `PRAGMA user_version` migrations.
- Use `@/` for `src/` imports and `@/assets/` for assets.
- Preserve genuine platform differences with `Platform` checks or `.web.ts`/`.web.tsx` files. Web
  has no cloud backup or system calendar notifications.

## Data Invariants

- Core finance workflows are offline and SQLite-backed. Do not add a Cash IO backend, mandatory
  network dependency, analytics, or logging of financial records, backups, tokens, or credentials.
- Parameterize user-controlled SQL values.
- Transfers are linked expense/income rows. Create, edit, move, and delete them atomically, and
  recalculate every affected account/month entry in `monthly_summaries`.
- Schema changes must append a migration from the current `DATABASE_VERSION`, increment the version,
  preserve existing data and foreign keys, and update row types, queries, and migration tests.
  Never rewrite a shipped migration.
- Backup providers are fixed by platform: Google Drive on Android, iCloud on iOS, unavailable on
  web.

## UI And Localization

- Use semantic tokens from `src/constants/theme.ts`; verify light/dark and mobile/web behavior.
- Put all user-facing copy in `src/i18n/locales/en.ts`, `es.ts`, and `pt.ts`. Update all three and
  use the locale formatters for dates, currency, and numbers.
- Expected domain failures use `AppError` descriptors and translated errors, not raw provider or
  SQLite messages.
- Preserve accessible roles, labels, states, platform-sized targets, safe areas, and web keyboard
  behavior. Do not communicate financial meaning through color alone.
- React Compiler is enabled. Do not add `useMemo`/`useCallback` as speculative optimization;
  retain them when API identity or effect behavior requires them.

## Testing Conventions

- Tests live in `__tests__/` as `*-test.ts` or `*-test.tsx`.
- Repository tests mock only the `SQLiteDatabase` methods used by the subject. Add regression tests
  for transaction atomicity, summary maintenance, and migrations when those paths change.
- Component tests use React Native Testing Library 14. Rendering and interactions may be async;
  await them and prefer accessible queries such as `getByRole`.
- Mock native modules at their boundary. Add platform-specific coverage when native and web paths
  diverge.

## Build Gotchas

- Web SQLite depends on the cross-origin headers configured for `expo-router` in `app.json`; verify
  `npm run web` after changing web database or Metro configuration.
- Keep Expo package versions aligned; prefer `npx expo install <package>` for Expo dependencies.
- Do not edit generated `.expo/`, `dist/`, `ios/`, or `android/` output. Native configuration lives
  in `app.json`, config plugins, or source modules.
- There is no standalone Prettier config. Follow the touched file's style and avoid formatting-only
  churn.
