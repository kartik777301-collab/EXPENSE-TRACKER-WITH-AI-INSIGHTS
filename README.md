# Ledgerline - Expense Tracker

A lightweight expense tracker — log spending, auto-categorize by keyword,
catch recurring charges, set budgets, and see trends at a glance.

**Live demo:** [expense-tracker-git-main-kartik-college.vercel.app](https://expense-tracker-git-main-kartik-college.vercel.app/)

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-3-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [License](#license)

## Features

- 🔐 Accounts with hashed passwords and JWT-based sessions
- ➕ Add expenses with automatic category detection from the description
- 📊 Dashboard: monthly totals, category breakdown chart, 30-day spend trend
- 💡 Insights: next-month forecast, month-over-month change, top category
- 🔁 Recurring-charge detection (same merchant + amount seen 2+ times)
- 🎯 Per-category monthly budgets with progress bars and over-budget alerts
- 📋 Full transaction history — filter by category, export to CSV, star/save items

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | Vanilla HTML/CSS/JS, [Chart.js](https://www.chartjs.org/) |
| Backend  | Node.js, Express |
| Database | SQLite (`better-sqlite3`) |
| Auth     | bcrypt password hashing + JWT sessions |
| Hosting  | Vercel (frontend) |

## Project Structure

```
.
├── ledgerline-frontend/
│   ├── index.html          # Static single-page app
│   └── README.md
└── ledgerline-server/
    ├── server.js            # Express app & routes
    ├── db.js                 # SQLite schema/setup
    ├── auth-middleware.js    # JWT verification
    ├── package.json
    ├── .env.example
    └── README.md
```

## Getting Started

### 1. Clone

```bash
git clone https://github.com/<your-username>/expense-tracker.git
cd expense-tracker
```

### 2. Run the backend

```bash
cd ledgerline-server
npm install
cp .env.example .env      # set JWT_SECRET to a long random string
npm start
```

The API runs at `http://localhost:4000` and creates a local
`ledgerline.db` SQLite file on first launch.

### 3. Run the frontend

```bash
cd ../ledgerline-frontend
npx serve .
```

Or just open `index.html` directly in a browser. It calls
`http://localhost:4000/api` by default — change the `API_BASE` constant
near the top of the `<script>` block in `index.html` to point at a
different backend (e.g. your deployed one).

## API Reference

All endpoints except `/signup` and `/login` require an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Body | Description |
|--------|----------|------|--------------|
| `POST` | `/api/signup` | `{ username, password }` | Create an account |
| `POST` | `/api/login` | `{ username, password }` | Log in, get a token |
| `GET` | `/api/expenses` | — | List the user's expenses |
| `POST` | `/api/expenses` | `{ merchant, amount, date, category }` | Add an expense |
| `DELETE` | `/api/expenses/:id` | — | Delete an expense |
| `GET` | `/api/budgets` | — | Get `{ category: limit }` |
| `PUT` | `/api/budgets/:category` | `{ limit }` | Set or clear a budget |
| `GET` | `/api/saved` | — | List saved expense IDs |
| `POST` | `/api/saved/:expenseId/toggle` | — | Star/unstar an expense |

## Deployment

- **Frontend**: deployed on Vercel (see live demo link above).
- **Backend**: SQLite works fine for a single instance, but doesn't
  survive redeploys on platforms with ephemeral disks. For production,
  swap in Postgres (`pg`) and point `DATABASE_URL` at a managed instance
  (Render, Railway, and Supabase all offer one) — see
  [`ledgerline-server/README.md`](ledgerline-server/README.md) for details.
- Set `JWT_SECRET` as an environment variable on whatever platform hosts
  the API — never commit `.env`.
- Lock down CORS to your deployed frontend's origin instead of the
  wide-open default in `server.js`.

## Security Notes

- Passwords are hashed with bcrypt (cost factor 10) — never stored or
  transmitted in plain text.
- Sessions use signed JWTs (7-day expiry) rather than trusting the client.
- Every database query is scoped to the authenticated user's ID, so one
  account can't read or modify another's data.

## License

MIT
