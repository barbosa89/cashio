# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Privacy-focused individuals who manually manage everyday personal finances and want dependable access to their records without handing financial data to a finance service.

## Product Purpose

Cash IO helps people record income and expenses, manage balances across accounts, plan monthly budgets, review financial trends, schedule financial reminders, and export their records. Success means users can understand and manage their day-to-day finances while retaining control of their data.

## Positioning

Cash IO is built around local-first ownership: financial records remain in a SQLite database on the user's device, the core product works offline, and cloud backup is optional and user-controlled rather than required for operation.

## Operating Context

- Users capture income, expenses, account transfers, categories, and tags.
- Users review transactions, balances, budgets, and charts by month and account.
- Users can export transactions over a monthly range as CSV.
- A financial calendar supports one-time and recurring events; system notifications are available on iOS and Android, while events remain viewable on web.
- The app follows the device color scheme and supports English, Spanish, and Brazilian Portuguese.

## Capabilities and Constraints

- The same Expo application ships to Android, iOS, and web while adapting platform-specific capabilities and behavior.
- Financial data is stored locally in SQLite and remains available offline.
- Optional backups use Google Drive on Android and iCloud on iOS. Backup is unavailable on web.
- Users can manage multiple accounts, opening balances, transfers, categories, tags, monthly budget allocations, and balance carry-forward behavior.
- The product does not operate its own server and does not use financial records for advertising or analytics.
- The native app is portrait-oriented.

## Brand Commitments

- Product name: Cash IO.
- Promise: "Your money. Your data. Always with you."
- Product language should be direct, practical, and reassuring about user control without making unsupported security or financial claims.
- Existing app icons and brand assets live under `assets/images/`.

## Evidence on Hand

- `README.md` documents the product promise, local-first architecture, privacy position, supported platforms, public website, and Google Play listing.
- The application contains working transaction, account, category, tag, budget, chart, report, financial-calendar, settings, and backup flows under `src/`.
- Localized product copy is maintained in `src/i18n/locales/`.
- No testimonials, customer counts, performance benchmarks, press claims, or other social proof are present and future work must not fabricate them.

## Product Principles

- Keep financial records under the user's control by default.
- Preserve useful core workflows without requiring connectivity or an account with Cash IO.
- Make routine financial tracking fast enough for consistent everyday use.
- Turn locally held records into clear monthly balances, budgets, trends, reminders, and portable reports.
- Adapt platform-specific capabilities without changing the product's core mental model.

## Accessibility & Inclusion

The application provides explicit accessibility labels, roles, states, alerts, and live-region messaging across core interactions. It supports English, Spanish, and Brazilian Portuguese and should preserve equivalent functionality and meaning across those languages.
