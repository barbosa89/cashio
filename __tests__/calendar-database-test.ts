import { DATABASE_VERSION, migrateDatabase } from "@/lib/database";

function databaseAtVersion(version: number) {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: version }),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
  };
}

describe("calendar_events migration", () => {
  test("upgrades an existing production database from version 6 to 7", async () => {
    const db = databaseAtVersion(6);
    await migrateDatabase(db as never);
    const sql = db.execAsync.mock.calls.flat().join("\n");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS calendar_events");
    expect(sql).not.toContain("DROP TABLE calendar_events");
    expect(sql).not.toMatch(/DROP TABLE (accounts|transactions|monthly_budget_allocations)/);
    expect(sql).toContain(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });

  test("includes calendar events in a clean installation", async () => {
    const db = databaseAtVersion(0);
    await migrateDatabase(db as never);
    expect(db.execAsync.mock.calls.flat().join("\n")).toContain(
      "CREATE TABLE IF NOT EXISTS calendar_events",
    );
  });

  test("is idempotent once the database is already current", async () => {
    const db = databaseAtVersion(DATABASE_VERSION);
    await migrateDatabase(db as never);
    expect(db.execAsync.mock.calls.flat().join("\n")).not.toContain(
      "CREATE TABLE IF NOT EXISTS calendar_events",
    );
  });
});

describe("transaction query indexes migration", () => {
  test("upgrades an existing production database from version 7 to 8", async () => {
    const db = databaseAtVersion(7);

    await migrateDatabase(db as never);

    const sql = db.execAsync.mock.calls.flat().join("\n");
    expect(sql).toContain("idx_transactions_account_date_id");
    expect(sql).toContain("idx_transactions_date_id");
    expect(sql).toContain("DROP INDEX IF EXISTS idx_transactions_month_account");
    expect(sql).not.toMatch(/DROP TABLE (accounts|transactions|monthly_summaries)/);
    expect(sql).toContain(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
});
