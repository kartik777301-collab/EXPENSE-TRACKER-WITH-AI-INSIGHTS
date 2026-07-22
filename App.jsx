import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Download, Trash2, TrendingUp, TrendingDown, Tag, Repeat, Wallet } from "lucide-react";

const CATEGORIES = ["Food", "Transport", "Utilities", "Entertainment", "Shopping", "Health", "Subscriptions", "Other"];

const CATEGORY_COLORS = {
  Food: "#3f6fee",
  Transport: "#22a06b",
  Utilities: "#e0a72d",
  Entertainment: "#e05252",
  Shopping: "#9b59d0",
  Health: "#1abc9c",
  Subscriptions: "#e67e22",
  Other: "#7f8c8d",
};

const KEYWORD_MAP = {
  Food: ["restaurant", "cafe", "coffee", "starbucks", "pizza", "food", "grocery", "supermarket", "diner", "burger", "bakery", "zomato", "swiggy"],
  Transport: ["uber", "lyft", "taxi", "fuel", "gas", "petrol", "metro", "bus", "train", "parking", "ola"],
  Utilities: ["electric", "water bill", "internet", "wifi", "phone bill", "utility", "gas bill", "broadband"],
  Entertainment: ["netflix", "movie", "cinema", "concert", "spotify", "game", "theatre", "hulu", "disney+"],
  Shopping: ["amazon", "mall", "clothing", "shoes", "electronics", "store", "shopping", "flipkart"],
  Health: ["pharmacy", "doctor", "hospital", "clinic", "medicine", "gym", "fitness", "dental"],
  Subscriptions: ["subscription", "membership", "monthly plan", "annual plan", "prime", "icloud"],
};

function autoCategorize(desc) {
  const d = desc.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((k) => d.includes(k))) return cat;
  }
  return "Other";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthKeyOf(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// Seed with a little sample data so the dashboard isn't empty on first load
const SEED_EXPENSES = [
  { id: 1, merchant: "Starbucks", amount: 6.5, date: shiftDate(-2), category: "Food" },
  { id: 2, merchant: "Uber", amount: 14.2, date: shiftDate(-4), category: "Transport" },
  { id: 3, merchant: "Netflix", amount: 15.99, date: shiftDate(-6), category: "Subscriptions" },
  { id: 4, merchant: "Whole Foods", amount: 62.3, date: shiftDate(-9), category: "Food" },
  { id: 5, merchant: "Netflix", amount: 15.99, date: shiftDate(-36), category: "Subscriptions" },
  { id: 6, merchant: "Shell Gas", amount: 41.0, date: shiftDate(-12), category: "Transport" },
];

function shiftDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [budgets, setBudgets] = useState({ Food: 300, Subscriptions: 40 });
  const [filterCategory, setFilterCategory] = useState("");

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("");

  const showAutoHint = category === "" && merchant.trim().length > 2;

  function handleAddExpense(e) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!merchant.trim() || isNaN(amt) || !date) return;
    const finalCategory = category || autoCategorize(merchant);

    setExpenses((prev) => [
      ...prev,
      { id: Date.now(), merchant: merchant.trim(), amount: amt, date, category: finalCategory },
    ]);

    setMerchant("");
    setAmount("");
    setDate(todayISO());
    setCategory("");
  }

  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function updateBudget(cat, value) {
    setBudgets((prev) => {
      const next = { ...prev };
      const val = parseFloat(value);
      if (!isNaN(val) && val > 0) next[cat] = val;
      else delete next[cat];
      return next;
    });
  }

  // ---------- Derived data ----------
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}`;
  }, []);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => monthKeyOf(e.date) === currentMonthKey),
    [expenses, currentMonthKey]
  );

  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const txnCount = monthExpenses.length;
  const avgTxn = txnCount ? total / txnCount : 0;

  const categoryTotals = useMemo(() => {
    const totals = {};
    monthExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [monthExpenses]);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const trendData = useMemo(() => {
    const days = [];
    const totalsByDay = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(key);
      totalsByDay[key] = 0;
    }
    expenses.forEach((e) => {
      if (Object.prototype.hasOwnProperty.call(totalsByDay, e.date)) {
        totalsByDay[e.date] += e.amount;
      }
    });
    return days.map((d) => ({ day: d.slice(5), amount: Math.round(totalsByDay[d] * 100) / 100 }));
  }, [expenses]);

  const recurringCounts = useMemo(() => {
    const counts = {};
    expenses.forEach((e) => {
      const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  const insights = useMemo(() => {
    const items = [];
    if (expenses.length < 3) {
      return [{ type: "neutral", text: "Add a few expenses to unlock forecasts and insights." }];
    }

    const byMonth = {};
    expenses.forEach((e) => {
      const k = monthKeyOf(e.date);
      byMonth[k] = (byMonth[k] || 0) + e.amount;
    });
    const months = Object.keys(byMonth).sort();
    const values = months.map((m) => byMonth[m]);

    if (values.length >= 2) {
      const recent = values.slice(-3);
      const forecast =
        recent.reduce((s, v, i) => s + v * (i + 1), 0) / recent.reduce((s, _, i) => s + (i + 1), 0);
      items.push({ type: "info", text: `Based on recent months, projected spend next month is roughly $${forecast.toFixed(2)}.` });

      const lastMonth = values[values.length - 1];
      const prevMonth = values[values.length - 2];
      if (prevMonth > 0) {
        const change = ((lastMonth - prevMonth) / prevMonth) * 100;
        if (change > 10) {
          items.push({ type: "warn", text: `Spending increased by ${change.toFixed(0)}% compared to the previous month.` });
        } else if (change < -10) {
          items.push({ type: "good", text: `Nice, spending dropped ${Math.abs(change).toFixed(0)}% compared to the previous month.` });
        }
      }
    } else {
      items.push({ type: "info", text: "Keep logging expenses across a couple of months to unlock a spending forecast." });
    }

    const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      items.push({ type: "info", text: `Your top spending category this month is ${topCat[0]} at $${topCat[1].toFixed(2)}.` });
    }

    const recurringCount = Object.values(recurringCounts).filter((c) => c >= 2).length;
    if (recurringCount > 0) {
      items.push({
        type: "info",
        text: `Detected ${recurringCount} likely recurring charge${recurringCount > 1 ? "s" : ""} (e.g. subscriptions). Review them for anything you no longer use.`,
      });
    }

    return items;
  }, [expenses, categoryTotals, recurringCounts]);

  const filteredSorted = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    return filterCategory ? sorted.filter((e) => e.category === filterCategory) : sorted;
  }, [expenses, filterCategory]);

  function exportCsv() {
    if (expenses.length === 0) return;
    let csv = "Date,Merchant,Category,Amount\n";
    expenses.forEach((e) => {
      csv += `${e.date},"${e.merchant.replace(/"/g, '""')}",${e.category},${e.amount.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- UI ----------
  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#f5f6fa", minHeight: "100vh", color: "#2b2d3a" }}>
      <header
        style={{
          background: "#3f6fee",
          color: "#fff",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>💰 Expense Tracker with AI Insights</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
            Log expenses, auto-categorize, and get simple spending forecasts.
          </p>
        </div>
        <button
          onClick={exportCsv}
          style={{
            background: "#eef1f9",
            color: "#2b2d3a",
            border: "none",
            borderRadius: 6,
            padding: "9px 14px",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={14} /> Export CSV
        </button>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: "20px auto",
          padding: "0 16px 60px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1.4fr",
          gap: 18,
        }}
        className="tracker-grid"
      >
        {/* LEFT COLUMN */}
        <div>
          <Card title="Add Expense">
            <form onSubmit={handleAddExpense}>
              <Label>Merchant / Description</Label>
              <Input
                type="text"
                placeholder="e.g. Starbucks, Uber, Netflix"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>

              <Label>
                Category{" "}
                {showAutoHint && (
                  <span style={{ fontSize: "0.75rem", color: "#6b7080", fontWeight: 400 }}>(auto-suggested)</span>
                )}
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={selectStyle}
              >
                <option value="">Auto-detect from description</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <button type="submit" style={primaryBtnStyle}>
                + Add Expense
              </button>
              <p style={{ fontSize: "0.75rem", color: "#6b7080", marginTop: 6 }}>
                Leave category as "Auto-detect" and a simple keyword-based classifier will guess it from the description.
              </p>
            </form>
          </Card>

          <Card title="Set Monthly Budgets (optional)">
            {CATEGORIES.map((c) => (
              <div key={c} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end", marginBottom: 6 }}>
                <label style={{ margin: 0, fontSize: "0.8rem", color: "#6b7080" }}>{c}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="No limit"
                  defaultValue={budgets[c] ?? ""}
                  onChange={(e) => updateBudget(c, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}
            <p style={{ fontSize: "0.75rem", color: "#6b7080", marginTop: 6 }}>
              Set a monthly limit per category to enable budget alerts below.
            </p>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <Card title="This Month at a Glance">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              <SummaryBox val={`$${total.toFixed(2)}`} lbl="Spent this month" />
              <SummaryBox val={txnCount} lbl="Transactions" />
              <SummaryBox val={`$${avgTxn.toFixed(2)}`} lbl="Avg / transaction" />
            </div>
            {pieData.length === 0 ? (
              <p style={{ color: "#6b7080", fontSize: "0.85rem" }}>No spending yet this month.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#7f8c8d"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="AI Insights">
            {insights.map((ins, i) => (
              <Insight key={i} type={ins.type}>
                {ins.text}
              </Insight>
            ))}
          </Card>

          <Card title="Budget Status">
            {Object.keys(budgets).length === 0 ? (
              <p style={{ color: "#6b7080", fontSize: "0.85rem" }}>No budgets set yet.</p>
            ) : (
              Object.entries(budgets).map(([cat, limit]) => {
                const spent = categoryTotals[cat] || 0;
                const pct = Math.min(100, (spent / limit) * 100);
                let barColor = "#22a06b";
                let note = "";
                if (pct >= 100) {
                  barColor = "#e05252";
                  note = " — over budget!";
                } else if (pct >= 80) {
                  barColor = "#e0a72d";
                  note = " — approaching limit";
                }
                return (
                  <div key={cat} style={{ marginBottom: 10, fontSize: "0.85rem" }}>
                    <div>
                      {cat}: ${spent.toFixed(2)} / ${limit.toFixed(2)}
                      {note}
                    </div>
                    <div style={{ background: "#eee", borderRadius: 6, height: 8, width: "100%", overflow: "hidden", marginTop: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* FULL WIDTH: TREND */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Spend by Day (last 30 days)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e4ea" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="amount" fill="#3f6fee" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* FULL WIDTH: TABLE */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: 1 }}>Transaction History</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ ...selectStyle, width: "auto", marginTop: 0 }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            }
          >
            {filteredSorted.length === 0 ? (
              <p style={{ color: "#6b7080", fontSize: "0.85rem", padding: "10px 0" }}>
                No transactions yet. Add your first expense above.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      {["Date", "Merchant", "Category", "Amount", ""].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "7px 6px",
                            borderBottom: "1px solid #e2e4ea",
                            color: "#6b7080",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.map((e) => {
                      const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
                      const isRecurring = recurringCounts[key] >= 2;
                      return (
                        <tr key={e.id}>
                          <td style={tdStyle}>{e.date}</td>
                          <td style={tdStyle}>
                            {e.merchant}{" "}
                            {isRecurring && (
                              <span style={{ ...tagStyle, background: "#fdeecb", color: "#9a6b0c", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Repeat size={10} /> recurring
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <span style={tagStyle}>{e.category}</span>
                          </td>
                          <td style={tdStyle}>${e.amount.toFixed(2)}</td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => deleteExpense(e.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e05252",
                                cursor: "pointer",
                                padding: "4px 8px",
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <footer style={{ textAlign: "center", color: "#6b7080", fontSize: "0.75rem", padding: 20 }}>
        Data lives in this session only — it's not saved to a server or your browser.
      </footer>

      <style>{`
        @media (max-width: 850px) {
          .tracker-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ---------- Small presentational helpers ----------

function Card({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e4ea", borderRadius: 10, padding: "16px 18px", marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem", borderBottom: "1px solid #e2e4ea", paddingBottom: 8 }}>{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7080", margin: "10px 0 4px" }}>{children}</label>;
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e2e4ea",
  borderRadius: 6,
  fontSize: "0.9rem",
  background: "#fbfbfd",
  boxSizing: "border-box",
};

const selectStyle = { ...inputStyle };

function Input(props) {
  return <input {...props} style={inputStyle} />;
}

const primaryBtnStyle = {
  background: "#3f6fee",
  color: "#fff",
  width: "100%",
  marginTop: 14,
  fontWeight: 600,
  border: "none",
  borderRadius: 6,
  fontSize: "0.9rem",
  padding: "9px 14px",
  cursor: "pointer",
};

function SummaryBox({ val, lbl }) {
  return (
    <div style={{ background: "#f8f9fd", border: "1px solid #e2e4ea", borderRadius: 8, padding: 10, textAlign: "center" }}>
      <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{val}</div>
      <div style={{ fontSize: "0.7rem", color: "#6b7080", textTransform: "uppercase" }}>{lbl}</div>
    </div>
  );
}

const insightStyles = {
  info: { border: "var(--primary)", bg: "#f4f7ff", border_color: "#3f6fee" },
  warn: { bg: "#fdf7e9", border_color: "#e0a72d" },
  bad: { bg: "#fdeded", border_color: "#e05252" },
  good: { bg: "#eaf8f1", border_color: "#22a06b" },
  neutral: { bg: "#f8f9fd", border_color: "#c5c9d6" },
};

const insightIcon = {
  info: <TrendingUp size={14} />,
  warn: <TrendingUp size={14} />,
  bad: <TrendingDown size={14} />,
  good: <TrendingDown size={14} />,
  neutral: <Wallet size={14} />,
};

function Insight({ type, children }) {
  const s = insightStyles[type] || insightStyles.info;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: "0.85rem",
        marginBottom: 8,
        borderLeft: `4px solid ${s.border_color}`,
        background: s.bg,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span style={{ marginTop: 1 }}>{insightIcon[type] || <Tag size={14} />}</span>
      <span>{children}</span>
    </div>
  );
}

const tdStyle = { textAlign: "left", padding: "7px 6px", borderBottom: "1px solid #e2e4ea" };
const tagStyle = { display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: "0.72rem", background: "#eef1f9", color: "#2e56c9" };