import Database from "better-sqlite3";

const db = new Database("ledgerline.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant  TEXT NOT NULL,
    amount    REAL NOT NULL,
    date      TEXT NOT NULL,
    category  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category  TEXT NOT NULL,
    limit_amt REAL NOT NULL,
    PRIMARY KEY (user_id, category)
  );

  CREATE TABLE IF NOT EXISTS saved (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, expense_id)
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
`);

export default db;
