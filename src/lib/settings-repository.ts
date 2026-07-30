import type { SQLiteDatabase } from 'expo-sqlite';

import {
  SUPPORTED_LANGUAGES,
  type LanguagePreference,
  type SupportedLanguage,
} from '@/i18n/types';
import type { SettingRow, SettingValueType } from '@/lib/database';

export type AppSettings = {
  accumulatePreviousBalances: boolean;
  autoCopyPreviousMonthBudget: boolean;
  languagePreference: LanguagePreference;
};

type SettingDefinition<TValue> = {
  defaultValue: TValue;
  key: keyof AppSettings;
  storageKey: string;
  type: SettingValueType;
  parse: (value: string) => TValue;
  serialize: (value: TValue) => string;
};

const supportedLanguageSet: ReadonlySet<string> = new Set(
  SUPPORTED_LANGUAGES,
);

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguageSet.has(value);
}

const SETTINGS_REGISTRY = {
  accumulatePreviousBalances: {
    defaultValue: false,
    key: 'accumulatePreviousBalances',
    parse: (value: string) => value === 'true',
    serialize: (value: boolean) => String(value),
    storageKey: 'accumulate_previous_balances',
    type: 'boolean',
  },
  autoCopyPreviousMonthBudget: {
    defaultValue: false,
    key: 'autoCopyPreviousMonthBudget',
    parse: (value: string) => value === 'true',
    serialize: (value: boolean) => String(value),
    storageKey: 'auto_copy_previous_month_budget',
    type: 'boolean',
  },
  languagePreference: {
    defaultValue: null,
    key: 'languagePreference',
    parse: (value: string) =>
      isSupportedLanguage(value) ? value : null,
    serialize: (value: LanguagePreference) => value ?? '',
    storageKey: 'language_preference',
    type: 'string',
  },
} satisfies { [Key in keyof AppSettings]: SettingDefinition<AppSettings[Key]> };

function nowIso() {
  return new Date().toISOString();
}

function getDefaultSettings(): AppSettings {
  return Object.values(SETTINGS_REGISTRY).reduce(
    (settings, definition) => ({
      ...settings,
      [definition.key]: definition.defaultValue,
    }),
    {} as AppSettings
  );
}

export async function getAppSettings(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<SettingRow>('SELECT key, value, value_type, created_at, updated_at FROM settings');
  const settings = getDefaultSettings();

  for (const row of rows) {
    const definition = Object.values(SETTINGS_REGISTRY).find((item) => item.storageKey === row.key);

    if (!definition || row.value_type !== definition.type) {
      continue;
    }

    settings[definition.key] = definition.parse(row.value) as never;
  }

  return settings;
}

type BooleanSettingKey =
  | 'accumulatePreviousBalances'
  | 'autoCopyPreviousMonthBudget';

export async function getLanguagePreference(
  db: SQLiteDatabase,
): Promise<LanguagePreference> {
  const definition = SETTINGS_REGISTRY.languagePreference;
  const row = await db.getFirstAsync<Pick<SettingRow, 'value' | 'value_type'>>(
    'SELECT value, value_type FROM settings WHERE key = ?',
    definition.storageKey,
  );

  if (!row || row.value_type !== definition.type) {
    return null;
  }

  return definition.parse(row.value);
}

export async function setLanguagePreference(
  db: SQLiteDatabase,
  preference: LanguagePreference,
) {
  const definition = SETTINGS_REGISTRY.languagePreference;

  if (!preference) {
    await db.runAsync(
      'DELETE FROM settings WHERE key = ?',
      definition.storageKey,
    );
    return;
  }

  await upsertSetting(
    db,
    definition.storageKey,
    definition.serialize(preference),
    definition.type,
  );
}

export async function updateSetting<Key extends BooleanSettingKey>(
  db: SQLiteDatabase,
  key: Key,
  value: AppSettings[Key]
) {
  const definition = SETTINGS_REGISTRY[key];
  await upsertSetting(
    db,
    definition.storageKey,
    definition.serialize(value),
    definition.type,
  );
}

async function upsertSetting(
  db: SQLiteDatabase,
  storageKey: string,
  value: string,
  type: SettingValueType,
) {
  const timestamp = nowIso();
  await db.runAsync(
    `INSERT INTO settings (key, value, value_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       value_type = excluded.value_type,
       updated_at = excluded.updated_at`,
    storageKey,
    value,
    type,
    timestamp,
    timestamp
  );
}
