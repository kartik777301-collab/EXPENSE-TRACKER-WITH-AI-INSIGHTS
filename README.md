# Ledgerline — Frontend

A small expense tracker: log spending, auto-categorize by keyword, track
recurring charges, set per-category budgets, and view spend trends.

**Live app:** https://expense-tracker-git-main-kartik-college.vercel.app/

## Overview

This is the client for Ledgerline. It talks to the [Ledgerline API](../ledgerline-server)
(Express + SQLite) for accounts, expenses, budgets, and saved/starred
transactions — nothing is stored in the browser itself.

## Features

- Email/password accounts (JWT-based sessions)
- Add expenses with auto-category detection from the merchant/description
- Home dashboard: monthly totals, category breakdown chart, 30-day spend trend
- AI-style insights: next-month forecast, month-over-month change, top category
- Recurring charge detection (same merchant + amount seen 2+ times)
- Per-category monthly budgets with progress bars and over-budget alerts
- Full transaction history with filtering, CSV export, and starring/saving

## Running locally

This is a static `index.html` — no build step. Either open it directly in
a browser, or serve it:

```bash
npx serve .
```

By default it points at `http://localhost:4000/api` for the backend. To
point it at a different backend (e.g. a deployed one), edit the
`API_BASE` constant near the top of the `<script>` block in `index.html`.

## Backend

See [`ledgerline-server/README.md`](../ledgerline-server/README.md) for
setup, the API reference, and deployment notes.
