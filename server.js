import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import db from "./db.js";
import { requireAuth, signToken } from "./auth-middleware.js";

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET — copy .env.example to .env and set one.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

/* ---------------------------------------------------------
   AUTH
--------------------------------------------------------- */
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || username.trim().length < 2) {
    return res.status(400).json({ error: "Username must be at least 2 characters." });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return res.status(409).json({ error: "That username is already taken." });

  const passwordHash = await bcrypt.hash(password, 10);
  const info = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);

  const user = { id: info.lastInsertRowid, username };
  res.json({ token: signToken(user), username });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "No account found with that username." });

  const ok = await bcrypt.compare(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ error: "Incorrect password." });

  res.json({ token: signToken(user), username: user.username });
});

/* ---------------------------------------------------------
   EXPENSES
--------------------------------------------------------- */
app.get("/api/expenses", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId);
  res.json(rows);
});

app.post("/api/expenses", requireAuth, (req, res) => {
  const { merchant, amount, date, category } = req.body || {};
  if (!merchant || typeof amount !== "number" || !date || !category) {
    return res.status(400).json({ error: "merchant, amount, date, category are required." });
  }
  const info = db
    .prepare(
      "INSERT INTO expenses (user_id, merchant, amount, date, category) VALUES (?, ?, ?, ?, ?)"
    )
    .run(req.userId, merchant, amount, date, category);
  const row = db.prepare("SELECT * FROM expenses WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.delete("/api/expenses/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  db.prepare("DELETE FROM saved WHERE expense_id = ? AND user_id = ?").run(
    req.params.id,
    req.userId
  );
  res.status(204).end();
});

/* ---------------------------------------------------------
   BUDGETS  (keyed by category, one row per category per user)
--------------------------------------------------------- */
app.get("/api/budgets", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT category, limit_amt FROM budgets WHERE user_id = ?").all(req.userId);
  const asObject = Object.fromEntries(rows.map((r) => [r.category, r.limit_amt]));
  res.json(asObject);
});

app.put("/api/budgets/:category", requireAuth, (req, res) => {
  const { limit } = req.body || {};
  const category = req.params.category;
  if (limit == null || isNaN(limit) || limit <= 0) {
    db.prepare("DELETE FROM budgets WHERE user_id = ? AND category = ?").run(req.userId, category);
    return res.json({ category, limit: null });
  }
  db.prepare(
    `INSERT INTO budgets (user_id, category, limit_amt) VALUES (?, ?, ?)
     ON CONFLICT(user_id, category) DO UPDATE SET limit_amt = excluded.limit_amt`
  ).run(req.userId, category, limit);
  res.json({ category, limit });
});

/* ---------------------------------------------------------
   SAVED (starred expenses)
--------------------------------------------------------- */
app.get("/api/saved", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT expense_id FROM saved WHERE user_id = ?").all(req.userId);
  res.json(rows.map((r) => r.expense_id));
});

app.post("/api/saved/:expenseId/toggle", requireAuth, (req, res) => {
  const expenseId = req.params.expenseId;
  const existing = db
    .prepare("SELECT 1 FROM saved WHERE user_id = ? AND expense_id = ?")
    .get(req.userId, expenseId);

  if (existing) {
    db.prepare("DELETE FROM saved WHERE user_id = ? AND expense_id = ?").run(req.userId, expenseId);
    return res.json({ saved: false });
  }
  db.prepare("INSERT INTO saved (user_id, expense_id) VALUES (?, ?)").run(req.userId, expenseId);
  res.json({ saved: true });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Ledgerline API running on http://localhost:${PORT}`);
});
