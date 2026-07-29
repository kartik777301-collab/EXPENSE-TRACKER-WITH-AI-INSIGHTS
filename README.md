# Ledgerline Expense tracker 

Express + SQLite backend for the Ledgerline expense tracker. Replaces the
old `localStorage`-only auth/data with real accounts (bcrypt password
hashing, JWT sessions) and a proper database.

## 1. Install & run

```bash
cd ledgerline-server
npm install
cp .env.example .env
# open .env and set JWT_SECRET to a long random string
npm start
```

The API will be listening on `http://localhost:4000`. It creates a
`ledgerline.db` SQLite file in this folder on first run — nothing else to
set up.

## 2. Point the frontend at it

Open `ledgerline-frontend/index.html` in a browser (or serve it with any
static file server). It's hardcoded to call `http://localhost:4000/api` —
change the `API_BASE` constant near the top of the `<script>` block if you
run the server somewhere else.

## 3. API reference

All endpoints except `/signup` and `/login` require an
`Authorization: Bearer <token>` header.

| Method | Path                        | Body                         | Notes |
|--------|-----------------------------|-------------------------------|-------|
| POST   | `/api/signup`               | `{ username, password }`     | Creates account, returns `{ token, username }` |
| POST   | `/api/login`                | `{ username, password }`     | Returns `{ token, username }` |
| GET    | `/api/expenses`             | —                              | List this user's expenses |
| POST   | `/api/expenses`             | `{ merchant, amount, date, category }` | Create one |
| DELETE | `/api/expenses/:id`         | —                              | Delete one |
| GET    | `/api/budgets`              | —                              | `{ category: limit, ... }` |
| PUT    | `/api/budgets/:category`    | `{ limit }` (or `null`)      | Set/clear a budget |
| GET    | `/api/saved`                | —                              | Array of saved expense IDs |
| POST   | `/api/saved/:expenseId/toggle` | —                          | Star/unstar |

## 4. Deploying

You didn't have a target picked yet — a few common options once you do:

- **Render / Railway / Fly.io**: all support "push a Node app, get a URL"
  deployment. SQLite works fine on a single instance but doesn't survive a
  redeploy/restart on platforms with ephemeral disks (Render's free tier,
  for example) — if you outgrow local dev, swap `better-sqlite3` for
  Postgres (`pg`) and point `DATABASE_URL` at a managed Postgres instance
  (Render, Railway, and Supabase all offer one).
- Whatever you pick, set `JWT_SECRET` as an environment variable in the
  platform's dashboard — don't commit `.env`.
- Update `API_BASE` in the frontend to your deployed URL, and add
  `cors({ origin: "https://your-frontend-domain" })` instead of the wide-
  open `cors()` currently in `server.js`.

## 5. Security notes vs. the old localStorage version

- Passwords are hashed with bcrypt (cost factor 10), not a custom checksum.
- Auth uses signed JWTs (7-day expiry) instead of trusting the client.
- Data lives server-side in SQLite, scoped per user via foreign keys —
  one user can't read another's expenses even by tampering with the
  frontend, since every query filters by the `userId` embedded in the
  verified token.
