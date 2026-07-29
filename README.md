# Expense Tracker with AI Insights

A browser-based expense tracker that auto-categorizes transactions, forecasts next month's spending, flags recurring charges, and tracks budgets — all stored locally via `localStorage`. No backend required.

#Frontend :
https://expense-tracker-git-main-kartik-college.vercel.app/

## File Structure

```
expense-tracker/
├── index.html   # Page markup/structure
├── style.css    # All styling (layout, cards, charts, tags, budget bars, etc.)
├── script.js    # App logic (state, categorization, rendering, charts, CSV export)
└── README.md    # This file
```

### `index.html`
Contains the page structure only: header, the "Add Expense" form, budget inputs, summary cards, insights panel, budget status panel, trend chart, and the transaction table. Links to `style.css` and `script.js`, and pulls in [Chart.js](https://www.chartjs.org/) from a CDN for the doughnut/bar charts.

### `style.css`
All visual styling — CSS custom properties (colors, radius) at the top, then layout (`.container`, `.card`, grid rules), form controls, buttons, table styling, tags, summary boxes, insight callouts, and budget progress bars.

### `script.js`
All the app's behavior:
- **Storage** — loads/saves `expenses` and `budgets` to `localStorage`.
- **Auto-categorization** — a keyword-matching function (`autoCategorize`) that guesses a category from the merchant/description text.
- **Rendering** — functions to render the transaction table, monthly summary, category doughnut chart, 30-day trend bar chart, AI-style insights (forecast, spend change, top category, recurring-charge detection), and budget status bars.
- **Events** — form submission, budget input changes, category filter, and CSV export.

## How to Use

Just open `index.html` in a browser — no build step or server needed. Since it references `style.css` and `script.js` by relative path, keep all three files in the same folder.

## Notes

- Data persists only in your browser's `localStorage` (per-browser, per-device — not synced anywhere).
- Chart.js is loaded from a public CDN, so an internet connection is needed for the charts to render.
