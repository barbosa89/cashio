import type { SQLiteDatabase } from 'expo-sqlite';

import type { SettingRow, SettingValueType } from '@/lib/database';

export type AppSettings = {
  accumulatePreviousBalances: boolean;
  autoCopyPreviousMonthBudget: boolean;
};

type SettingDefinition<TValue> = {
  defaultValue: TValue;
  key: keyof AppSettings;
  storageKey: string;
  type: SettingValueType;
  parse: (value: string) => TValue;
  serialize: (value: TValue) => string;
};

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

export async function updateSetting<Key extends keyof AppSettings>(
  db: SQLiteDatabase,
  key: Key,
  value: AppSettings[Key]
) {
  const definition = SETTINGS_REGISTRY[key];
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO settings (key, value, value_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       value_type = excluded.value_type,
       updated_at = excluded.updated_at`,
    definition.storageKey,
    definition.serialize(value),
    definition.type,
    timestamp,
    timestamp
  );
}
