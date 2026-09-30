# Cash IO Architecture

## Overview

Cash IO is one Expo application targeting Android, iOS, and static web output. It is local-first:
the SQLite database is the source of truth for financial and calendar data, and no application
server participates in normal operation.

## Runtime Composition

`src/app/_layout.tsx` is the composition root. It initializes the application in this order:

1. `LocalizationProvider` resolves the device or saved language.
2. Fonts and the system color scheme are loaded.
3. Native users pass through the optional backup-restore gate.
4. `SQLiteProvider` opens `cashio.db` and calls `migrateDatabase`.
5. The localization preference gate, calendar notification controller, and Expo Router drawer are
   mounted.
6. Native background-backup registration and opportunistic backup run after database readiness.

Web delays database mounting until the component has mounted, allowing the SQLite web worker to
initialize in the browser environment.

## Layers

### Routes

Expo Router maps files in `src/app/` to typed routes. Route modules should primarily parse route
parameters, select a screen/editor component, and configure navigation. The root layout owns
global providers and drawer destinations.

### Components

`src/components/` contains feature screens and reusable controls. Larger features use folders,
while focused controls use individual files. Components consume hooks and translated copy; they
should not contain raw SQL or cloud-provider details.

The visual vocabulary comes from `src/constants/theme.ts`, `ThemedText`, `ThemedView`, and shared
controls. `DESIGN.md` defines the intended behavior beyond individual component implementations.

### Hooks

Hooks bridge repositories and UI state. For example, `useCashioData` obtains the current
`SQLiteDatabase`, loads repositories when a route gains focus, and refreshes affected state after
mutations. Feature-specific hooks follow the same boundary for settings and calendar events.

### Domain And Persistence

`src/lib/database.ts` owns schema types, initial data, and ordered migrations. Repository modules
own validation, SQL queries, and atomic mutations:

- `cashio-repository.ts`: accounts, categories, tags, transactions, transfers, budgets, balances,
  and monthly summaries.
- `calendar-repository.ts`: persisted calendar events.
- `settings-repository.ts`: typed application settings.
- `calendar-occurrences.ts`: recurrence expansion independent of persistence.
- `calendar-notifications.ts` and `calendar-notification-plan.ts`: native notification boundaries
  and deterministic scheduling plans.
- `report-csv.ts` and `report-export*`: report generation and platform-specific export behavior.

Expected domain failures are represented by `AppError` codes and translated at the UI boundary.

## Important Data Flows

### Transactions

UI form -> `useCashioData` -> `cashio-repository` -> SQLite transaction -> refresh UI state.

A transfer is a logical operation represented by linked expense and income rows. Transaction
mutations also recalculate affected monthly summaries. Editing dates, accounts, amounts, or
transfer status can affect multiple account/month combinations.

Native voice capture follows a stricter draft boundary:

`audio cache -> pinned local Gemma model -> constrained semantic JSON -> local catalog resolver -> partial transaction form -> explicit repository save`.

`src/lib/ai/` owns artifact integrity, the native model adapter, the extraction schema, WAV encoding,
and deterministic draft resolution. Audio and drafts are ephemeral; only the existing transaction
repository can write to SQLite. Web exposes no model runtime and retains manual transaction entry.
Model contexts and artifact mutations are owner-scoped to prevent stale screen cleanup from affecting
another operation. `app.config.js` enables AI plugins and microphone permissions only for the explicit
development and internal AI profiles.

### Calendar

Calendar editor -> calendar hook -> `calendar-repository` -> SQLite. Recurrence helpers expand
stored rules into visible occurrences. The notification controller turns events into a desired
notification plan and reconciles native schedules. Web displays events but does not schedule
system notifications.

### Localization

`src/i18n/index.ts` registers resources from `src/i18n/locales/`. The localization provider exposes
the active language and translator. Locale-aware formatters centralize dates, numbers, and
currency. Seed category/account names use the language selected when a database is first created.

### Backup

Backup orchestration lives in `src/lib/backup/`. Provider selection is platform-specific:

- Android: Google Drive.
- iOS: iCloud through `react-native-cloud-store`.
- Web: unavailable.

Local backup packaging and storage metadata remain separate from cloud-provider implementations.
Background work is registered only on supported native platforms.

## Platform Adaptation

Prefer shared behavior, then isolate genuine differences using `Platform` checks or platform file
suffixes such as `.web.ts` and `.web.tsx`. Current examples include report export, color scheme,
and animated icons. Native capabilities requiring custom modules must be tested in a development
build rather than Expo Go.

## Tests

Tests live in `__tests__/` and use the `*-test.ts` or `*-test.tsx` naming convention. Pure domain
tests cover recurrence and notification planning. Repository tests provide small SQLite API mocks.
Component tests use React Native Testing Library and mock platform boundaries such as routing,
notifications, and theme providers.

## Change Guide

| Change | Primary locations | Required follow-through |
| --- | --- | --- |
| New screen | `src/app/`, `src/components/` | Typed route, navigation, accessibility, component test |
| Financial rule | `src/lib/cashio-repository.ts` | Repository tests, summary/transfer invariants |
| Schema | `src/lib/database.ts` | Versioned migration, row types, repository and migration tests |
| Calendar recurrence | `src/lib/calendar-*` | Occurrence and notification-plan tests |
| User-facing copy | `src/i18n/locales/` | Equivalent English, Spanish, and Portuguese keys |
| Theme/UI primitive | `src/constants/theme.ts`, shared components | Light/dark, mobile/web, accessibility |
| Native capability | `app.json`, platform library/module | Development-build verification and web fallback |
| Backup behavior | `src/lib/backup/` | Platform boundary, privacy, failure and restore behavior |
