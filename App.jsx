import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Home as HomeIcon, RefreshCw, List, Star, LogOut, Trash2, Download } from "lucide-react";


const CATEGORIES = ["Food","Transport","Utilities","Entertainment","Shopping","Health","Subscriptions","Other"];

const KEYWORD_MAP = {
  Food: ["restaurant","cafe","coffee","starbucks","pizza","food","grocery","supermarket","diner","burger","bakery","zomato","swiggy"],
  Transport: ["uber","lyft","taxi","fuel","gas","petrol","metro","bus","train","parking","ola"],
  Utilities: ["electric","water bill","internet","wifi","phone bill","utility","gas bill","broadband"],
  Entertainment: ["netflix","movie","cinema","concert","spotify","game","theatre","hulu","disney+"],
  Shopping: ["amazon","mall","clothing","shoes","electronics","store","shopping","flipkart"],
  Health: ["pharmacy","doctor","hospital","clinic","medicine","gym","fitness","dental"],
  Subscriptions: ["subscription","membership","monthly plan","annual plan","prime","icloud"]
};

const CHART_COLORS = ["#1f8a70","#c98a2c","#c0392b","#5b7fd6","#9b59d0","#2c9c9c","#d67e3c","#8a8674"];

function autoCategorize(desc){
  const d = desc.toLowerCase();
  for(const [cat, keywords] of Object.entries(KEYWORD_MAP)){
    if(keywords.some(k => d.includes(k))) return cat;
  }
  return "Other";
}

function simpleHash(str){
  let hash = 0;
  for(let i=0;i<str.length;i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36) + "_" + str.length;
}

function todayStr(){ return new Date().toISOString().slice(0,10); }
function currentMonthKey(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; }
function monthKeyOf(dateStr){ const d = new Date(dateStr); return `${d.getFullYear()}-${d.getMonth()}`; }

function emptyUserRecord(){ return { expenses: [], budgets: {}, savedIds: [] }; }


export default function Ledgerline(){
 
  const [users, setUsers] = useState({});
  const [userData, setUserData] = useState({});
  const [session, setSession] = useState(null);

  const [authTab, setAuthTab] = useState("login");
  const [authError, setAuthError] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");

  const [activePage, setActivePage] = useState("home");

  
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");

  const [filterCategory, setFilterCategory] = useState("");

  const record = session ? (userData[session] || emptyUserRecord()) : emptyUserRecord();
  const { expenses, budgets, savedIds } = record;

  function updateRecord(updater){
    setUserData(prev => ({
      ...prev,
      [session]: updater(prev[session] || emptyUserRecord())
    }));
  }


  function handleLogin(e){
    e.preventDefault();
    const u = loginUsername.trim();
    if(!users[u]){ setAuthError("No account found with that username."); return; }
    if(users[u].passwordHash !== simpleHash(loginPassword)){ setAuthError("Incorrect password."); return; }
    setAuthError("");
    setSession(u);
    setLoginUsername(""); setLoginPassword("");
  }

  function handleSignup(e){
    e.preventDefault();
    const u = signupUsername.trim();
    if(u.length < 2){ setAuthError("Username must be at least 2 characters."); return; }
    if(signupPassword.length < 4){ setAuthError("Password must be at least 4 characters."); return; }
    if(signupPassword !== signupPassword2){ setAuthError("Passwords don't match."); return; }
    if(users[u]){ setAuthError("That username is already taken."); return; }
    setUsers(prev => ({ ...prev, [u]: { passwordHash: simpleHash(signupPassword), createdAt: new Date().toISOString() } }));
    setAuthError("");
    setSession(u);
    setSignupUsername(""); setSignupPassword(""); setSignupPassword2("");
  }

  function handleLogout(){
    setSession(null);
    setActivePage("home");
  }


  const recurringCounts = useMemo(()=>{
    const counts = {};
    expenses.forEach(e=>{
      const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
      counts[key] = (counts[key]||0) + 1;
    });
    return counts;
  }, [expenses]);

  const monthExpenses = useMemo(()=>{
    const key = currentMonthKey();
    return expenses.filter(e=>monthKeyOf(e.date)===key);
  }, [expenses]);

  const summary = useMemo(()=>{
    const total = monthExpenses.reduce((s,e)=>s+e.amount,0);
    const count = monthExpenses.length;
    const avg = count ? total/count : 0;
    return { total, count, avg };
  }, [monthExpenses]);

  const categoryTotals = useMemo(()=>{
    const totals = {};
    monthExpenses.forEach(e=>{ totals[e.category] = (totals[e.category]||0) + e.amount; });
    return totals;
  }, [monthExpenses]);

  const pieData = Object.entries(categoryTotals).map(([name, value])=>({ name, value }));

  const trendData = useMemo(()=>{
    const days = [];
    const totalsByDay = {};
    for(let i=29;i>=0;i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      days.push(key);
      totalsByDay[key] = 0;
    }
    expenses.forEach(e=>{
      if(totalsByDay.hasOwnProperty(e.date)){ totalsByDay[e.date] += e.amount; }
    });
    return days.map(d => ({ label: d.slice(5), amount: totalsByDay[d] }));
  }, [expenses]);

  const insights = useMemo(()=>{
    if(expenses.length < 3) return null;
    const byMonth = {};
    expenses.forEach(e=>{ const k = monthKeyOf(e.date); byMonth[k] = (byMonth[k]||0) + e.amount; });
    const months = Object.keys(byMonth).sort();
    const values = months.map(m=>byMonth[m]);

    const items = [];

    if(values.length >= 2){
      const recent = values.slice(-3);
      const forecast = recent.reduce((s,v,i)=> s + v*(i+1), 0) / recent.reduce((s,_,i)=>s+(i+1),0);
      items.push({ type:"info", text: <>📈 Based on recent months, projected spend next month is roughly <strong>${forecast.toFixed(2)}</strong>.</> });

      const lastMonth = values[values.length-1];
      const prevMonth = values[values.length-2];
      if(prevMonth > 0){
        const change = ((lastMonth - prevMonth)/prevMonth*100);
        if(change > 10){
          items.push({ type:"warn", text: `⚠️ Spending increased by ${change.toFixed(0)}% compared to the previous month.` });
        } else if(change < -10){
          items.push({ type:"good", text: `✅ Nice, spending dropped ${Math.abs(change).toFixed(0)}% compared to the previous month.` });
        }
      }
    } else {
      items.push({ type:"info", text: "📈 Keep logging expenses across a couple of months to unlock a spending forecast." });
    }

    const topCat = Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1])[0];
    if(topCat){
      items.push({ type:"info", text: <>🏷️ Your top spending category this month is <strong>{topCat[0]}</strong> at ${topCat[1].toFixed(2)}.</> });
    }

    const recurringCount = Object.values(recurringCounts).filter(c=>c>=2).length;
    if(recurringCount > 0){
      items.push({ type:"info", text: `🔁 Detected ${recurringCount} likely recurring charge${recurringCount>1?'s':''}. See the Services page for details.` });
    }

    return items;
  }, [expenses, categoryTotals, recurringCounts]);

  const services = useMemo(()=>{
    const seen = {};
    expenses.forEach(e=>{
      const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
      if(recurringCounts[key] >= 2){
        if(!seen[key] || new Date(e.date) > new Date(seen[key].date)){ seen[key] = e; }
      }
    });
    return Object.entries(seen);
  }, [expenses, recurringCounts]);

  const sortedFilteredExpenses = useMemo(()=>{
    const sorted = [...expenses].sort((a,b)=> new Date(b.date) - new Date(a.date));
    return filterCategory ? sorted.filter(e=>e.category===filterCategory) : sorted;
  }, [expenses, filterCategory]);

  const savedExpenses = useMemo(()=>{
    return expenses.filter(e=>savedIds.includes(e.id)).sort((a,b)=> new Date(b.date) - new Date(a.date));
  }, [expenses, savedIds]);


  function handleAddExpense(e){
    e.preventDefault();
    const amt = parseFloat(amount);
    if(!merchant.trim() || isNaN(amt) || !date) return;
    const cat = category || autoCategorize(merchant);
    updateRecord(rec => ({ ...rec, expenses: [...rec.expenses, { id: Date.now(), merchant: merchant.trim(), amount: amt, date, category: cat }] }));
    setMerchant(""); setAmount(""); setDate(todayStr()); setCategory("");
  }

  function toggleSaved(id){
    updateRecord(rec => ({
      ...rec,
      savedIds: rec.savedIds.includes(id) ? rec.savedIds.filter(x=>x!==id) : [...rec.savedIds, id]
    }));
  }

  function deleteExpense(id){
    updateRecord(rec => ({
      ...rec,
      expenses: rec.expenses.filter(e=>e.id!==id),
      savedIds: rec.savedIds.filter(x=>x!==id)
    }));
  }

  function setBudget(cat, val){
    updateRecord(rec => {
      const next = { ...rec.budgets };
      if(!isNaN(val) && val > 0){ next[cat] = val; } else { delete next[cat]; }
      return { ...rec, budgets: next };
    });
  }

  function exportCsv(){
    if(expenses.length === 0){ return; }
    let csv = "Date,Merchant,Category,Amount\n";
    expenses.forEach(e=>{
      csv += `${e.date},"${e.merchant.replace(/"/g,'""')}",${e.category},${e.amount.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const showAutoTagHint = category === "" && merchant.trim().length > 2;


  if(!session){
    return (
      <div style={styles.authScreen}>
        <style>{globalCss}</style>
        <div style={styles.authCard}>
          <div style={styles.authAccent} />
          <div style={styles.authBrand}>
            <span style={styles.brandMark}>Ledger<span style={styles.brandAccent}>line</span></span>
          </div>
          <p style={styles.authSub}>Track spending, spot patterns, stay on budget.</p>

          <div style={styles.authTabs}>
            <button style={{...styles.authTab, ...(authTab==="login"?styles.authTabActive:{})}}
              onClick={()=>{ setAuthTab("login"); setAuthError(""); }}>Log in</button>
            <button style={{...styles.authTab, ...(authTab==="signup"?styles.authTabActive:{})}}
              onClick={()=>{ setAuthTab("signup"); setAuthError(""); }}>Sign up</button>
          </div>

          {authError && <div style={styles.authError}>{authError}</div>}

          {authTab === "login" ? (
            <form onSubmit={handleLogin}>
              <div style={styles.authField}>
                <label style={styles.authLabel}>Username</label>
                <input style={styles.authInput} type="text" value={loginUsername}
                  onChange={e=>setLoginUsername(e.target.value)} autoComplete="username" required />
              </div>
              <div style={styles.authField}>
                <label style={styles.authLabel}>Password</label>
                <input style={styles.authInput} type="password" value={loginPassword}
                  onChange={e=>setLoginPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              <button type="submit" style={styles.authSubmit}>Log in</button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <div style={styles.authField}>
                <label style={styles.authLabel}>Choose a username</label>
                <input style={styles.authInput} type="text" value={signupUsername}
                  onChange={e=>setSignupUsername(e.target.value)} autoComplete="username" required />
              </div>
              <div style={styles.authField}>
                <label style={styles.authLabel}>Choose a password</label>
                <input style={styles.authInput} type="password" value={signupPassword}
                  onChange={e=>setSignupPassword(e.target.value)} autoComplete="new-password" required minLength={4} />
              </div>
              <div style={styles.authField}>
                <label style={styles.authLabel}>Confirm password</label>
                <input style={styles.authInput} type="password" value={signupPassword2}
                  onChange={e=>setSignupPassword2(e.target.value)} autoComplete="new-password" required minLength={4} />
              </div>
              <button type="submit" style={styles.authSubmit}>Create account</button>
            </form>
          )}

          <p style={styles.authHint}>Demo authentication only — accounts and data live in this component's memory for the current session, not on a server, and passwords aren't securely encrypted. Don't reuse a real password here.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "home", label: "Home", Icon: HomeIcon },
    { key: "services", label: "Services", Icon: RefreshCw },
    { key: "history", label: "History", Icon: List },
    { key: "saved", label: "Saved", Icon: Star },
  ];

  return (
    <div style={styles.appRoot}>
      <style>{globalCss}</style>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarBrand}>
            <div style={styles.sidebarMark}>Ledger<span style={styles.brandAccent}>line</span></div>
            <span style={styles.sidebarTag}>Expense Tracker</span>
          </div>
          <nav style={styles.sidebarNav}>
            {navItems.map(({key,label,Icon})=>(
              <button key={key}
                style={{...styles.navItem, ...(activePage===key ? styles.navItemActive : {})}}
                onClick={()=>setActivePage(key)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
          <div style={styles.sidebarUser}>
            <div style={styles.sidebarWho}>{session}</div>
            <div style={styles.sidebarRole}>Signed in</div>
            <button style={styles.logoutBtn} onClick={handleLogout}><LogOut size={13} style={{marginRight:6, verticalAlign:"-2px"}} />Log out</button>
          </div>
        </aside>

        <main style={styles.content}>
          {activePage === "home" && (
            <HomePage
              merchant={merchant} setMerchant={setMerchant}
              amount={amount} setAmount={setAmount}
              date={date} setDate={setDate}
              category={category} setCategory={setCategory}
              showAutoTagHint={showAutoTagHint}
              handleAddExpense={handleAddExpense}
              summary={summary}
              pieData={pieData}
              trendData={trendData}
              insights={insights}
            />
          )}
          {activePage === "services" && (
            <ServicesPage
              budgets={budgets} setBudget={setBudget}
              categoryTotals={categoryTotals}
              services={services}
            />
          )}
          {activePage === "history" && (
            <HistoryPage
              filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              expenses={sortedFilteredExpenses}
              recurringCounts={recurringCounts}
              savedIds={savedIds}
              toggleSaved={toggleSaved}
              deleteExpense={deleteExpense}
              exportCsv={exportCsv}
            />
          )}
          {activePage === "saved" && (
            <SavedPage expenses={savedExpenses} toggleSaved={toggleSaved} />
          )}
        </main>
      </div>
      <footer style={styles.footer}>Data lives only in this session's memory, scoped to your account — nothing is uploaded anywhere.</footer>
    </div>
  );
}


function HomePage({ merchant, setMerchant, amount, setAmount, date, setDate, category, setCategory,
                     showAutoTagHint, handleAddExpense, summary, pieData, trendData, insights }){
  return (
    <section>
      <div style={styles.pageHead}>
        <h1 style={styles.h1}>Home</h1>
        <p style={styles.pageSub}>Your spending at a glance, plus quick-add for new expenses.</p>
      </div>

      <div style={styles.grid2}>
        <div>
          <div style={styles.card}>
            <h2 style={styles.cardH2}>Add Expense</h2>
            <form onSubmit={handleAddExpense}>
              <label style={styles.label}>Merchant / Description</label>
              <input style={styles.input} type="text" value={merchant} onChange={e=>setMerchant(e.target.value)}
                placeholder="e.g. Starbucks, Uber, Netflix" required />

              <div style={styles.row2}>
                <div>
                  <label style={styles.label}>Amount</label>
                  <input style={styles.input} type="number" step="0.01" min="0" value={amount}
                    onChange={e=>setAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div>
                  <label style={styles.label}>Date</label>
                  <input style={styles.input} type="date" value={date} onChange={e=>setDate(e.target.value)} required />
                </div>
              </div>

              <label style={styles.label}>Category {showAutoTagHint && <span style={styles.hint}>(auto-suggested)</span>}</label>
              <select style={styles.input} value={category} onChange={e=>setCategory(e.target.value)}>
                <option value="">Auto-detect from description</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>

              <button type="submit" style={styles.btnPrimary}>+ Add Expense</button>
              <p style={styles.hint}>Leave category as "Auto-detect" and a simple keyword classifier will guess it from the description.</p>
            </form>
          </div>
        </div>

        <div>
          <div style={styles.card}>
            <h2 style={styles.cardH2}>This Month at a Glance</h2>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryBox}>
                <div style={styles.summaryVal}>${summary.total.toFixed(2)}</div>
                <div style={styles.summaryLbl}>Spent this month</div>
              </div>
              <div style={styles.summaryBox}>
                <div style={styles.summaryVal}>{summary.count}</div>
                <div style={styles.summaryLbl}>Transactions</div>
              </div>
              <div style={styles.summaryBox}>
                <div style={styles.summaryVal}>${summary.avg.toFixed(2)}</div>
                <div style={styles.summaryLbl}>Avg / transaction</div>
              </div>
            </div>
            {pieData.length === 0 ? (
              <p style={styles.empty}>No spending logged this month yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i)=><Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v)=>`$${v.toFixed(2)}`} />
                  <Legend wrapperStyle={{fontSize:11}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardH2}>AI Insights</h2>
            {!insights ? (
              <p style={styles.empty}>Add a few expenses to unlock forecasts and insights.</p>
            ) : (
              insights.map((ins, i)=>(
                <div key={i} style={{...styles.insight, ...(ins.type==="warn"?styles.insightWarn:ins.type==="good"?styles.insightGood:{})}}>
                  {ins.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardH2}>Spend by Day (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dcd6c4" vertical={false} />
            <XAxis dataKey="label" tick={{fontSize:9}} interval={2} />
            <YAxis tick={{fontSize:10}} width={40} />
            <Tooltip formatter={(v)=>`$${Number(v).toFixed(2)}`} />
            <Bar dataKey="amount" fill="#1f8a70" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}


function ServicesPage({ budgets, setBudget, categoryTotals, services }){
  return (
    <section>
      <div style={styles.pageHead}>
        <h1 style={styles.h1}>Services</h1>
        <p style={styles.pageSub}>Recurring charges detected from your history, and monthly budgets per category.</p>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h2 style={styles.cardH2}>Set Monthly Budgets</h2>
          {CATEGORIES.map(c=>(
            <div key={c} style={{...styles.row2, alignItems:"end", marginBottom:6}}>
              <label style={{...styles.label, margin:0}}>{c}</label>
              <input style={styles.input} type="number" min="0" step="1" placeholder="No limit"
                defaultValue={budgets[c] ?? ""}
                onBlur={e=>setBudget(c, parseFloat(e.target.value))} />
            </div>
          ))}
          <p style={styles.hint}>Set a monthly limit per category to enable budget alerts.</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardH2}>Budget Status</h2>
          {Object.keys(budgets).length === 0 ? (
            <p style={styles.empty}>No budgets set yet. Set one on the left to see alerts here.</p>
          ) : (
            Object.entries(budgets).map(([cat, limit])=>{
              const spent = categoryTotals[cat] || 0;
              const pct = Math.min(100, (spent/limit)*100);
              let barColor = "#1f8a70", note = "";
              if(pct >= 100){ barColor = "#c0392b"; note = " — over budget!"; }
              else if(pct >= 80){ barColor = "#c98a2c"; note = " — approaching limit"; }
              return (
                <div key={cat} style={styles.budgetItem}>
                  <div style={{flex:1}}>
                    <div>{cat}: <span style={styles.mono}>${spent.toFixed(2)} / ${limit.toFixed(2)}</span>{note}</div>
                    <div style={styles.budgetBarBg}><div style={{...styles.budgetBarFill, width:`${pct}%`, background:barColor}} /></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardH2}>Detected Recurring Services</h2>
        {services.length === 0 ? (
          <p style={styles.empty}>No recurring charges detected yet. These show up once a merchant + amount repeats at least twice.</p>
        ) : (
          services.map(([key, e])=>(
            <div key={key} style={styles.serviceCard}>
              <div>
                <div style={styles.serviceName}>{e.merchant}</div>
                <div style={styles.serviceMeta}>{e.category} · last charge {e.date}</div>
              </div>
              <div style={styles.mono}>${e.amount.toFixed(2)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}


function HistoryPage({ filterCategory, setFilterCategory, expenses, recurringCounts, savedIds, toggleSaved, deleteExpense, exportCsv }){
  return (
    <section>
      <div style={styles.pageHead}>
        <h1 style={styles.h1}>History</h1>
        <p style={styles.pageSub}>Every transaction you've logged. Star one to pin it to Saved.</p>
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}>
          <select style={{...styles.input, maxWidth:220}} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <button style={styles.btnSecondary} onClick={exportCsv}><Download size={13} style={{marginRight:5, verticalAlign:"-2px"}} />Export CSV</button>
        </div>

        {expenses.length === 0 ? (
          <p style={styles.empty}>No transactions yet. Add your first expense on the Home page.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}></th><th style={styles.th}>Date</th><th style={styles.th}>Merchant</th><th style={styles.th}>Category</th><th style={styles.th}>Amount</th><th style={styles.th}></th></tr>
            </thead>
            <tbody>
              {expenses.map(e=>{
                const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
                const isRecurring = recurringCounts[key] >= 2;
                const isSaved = savedIds.includes(e.id);
                return (
                  <tr key={e.id}>
                    <td style={styles.td}>
                      <button style={{...styles.btnStar, color: isSaved ? "#c98a2c" : "#dcd6c4"}}
                        onClick={()=>toggleSaved(e.id)} title={isSaved ? "Remove from Saved" : "Save this transaction"}>★</button>
                    </td>
                    <td style={styles.td}>{e.date}</td>
                    <td style={styles.td}>{e.merchant} {isRecurring && <span style={{...styles.tag, ...styles.recurringTag}}>recurring</span>}</td>
                    <td style={styles.td}><span style={styles.tag}>{e.category}</span></td>
                    <td style={{...styles.td, ...styles.mono}}>${e.amount.toFixed(2)}</td>
                    <td style={styles.td}><button style={styles.btnDanger} onClick={()=>deleteExpense(e.id)}><Trash2 size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}


function SavedPage({ expenses, toggleSaved }){
  return (
    <section>
      <div style={styles.pageHead}>
        <h1 style={styles.h1}>Saved</h1>
        <p style={styles.pageSub}>Transactions you've starred for quick reference — receipts to double check, disputed charges, whatever you want to keep handy.</p>
      </div>
      <div style={styles.card}>
        {expenses.length === 0 ? (
          <p style={styles.empty}>Nothing saved yet. Star a transaction in History to pin it here.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}></th><th style={styles.th}>Date</th><th style={styles.th}>Merchant</th><th style={styles.th}>Category</th><th style={styles.th}>Amount</th></tr>
            </thead>
            <tbody>
              {expenses.map(e=>(
                <tr key={e.id}>
                  <td style={styles.td}><button style={{...styles.btnStar, color:"#c98a2c"}} onClick={()=>toggleSaved(e.id)} title="Remove from Saved">★</button></td>
                  <td style={styles.td}>{e.date}</td>
                  <td style={styles.td}>{e.merchant}</td>
                  <td style={styles.td}><span style={styles.tag}>{e.category}</span></td>
                  <td style={{...styles.td, ...styles.mono}}>${e.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}


const COLORS = {
  ink:"#132a2f", paper:"#f7f5ee", paperDim:"#efece0", card:"#fffdf8",
  accent:"#1f8a70", accentDark:"#146354", accentSoft:"#e4f3ee",
  line:"#dcd6c4", muted:"#726f60", bad:"#c0392b", badSoft:"#f8e6e3",
  warn:"#c98a2c", warnSoft:"#f8eedb", good:"#1f8a70"
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  #ledgerline-root button:hover.hoverable { opacity: 0.9; }
`;

const styles = {
  authScreen:{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
    background:`repeating-linear-gradient(180deg, transparent, transparent 38px, ${COLORS.line} 38px, ${COLORS.line} 39px), ${COLORS.paper}`,
    padding:24, fontFamily:FONT_BODY, color:COLORS.ink },
  authCard:{ background:COLORS.card, border:`1px solid ${COLORS.line}`, borderRadius:14, width:"100%", maxWidth:400,
    padding:"36px 34px 30px", boxShadow:"0 18px 40px -22px rgba(19,42,47,0.35)", position:"relative" },
  authAccent:{ position:"absolute", left:0, top:22, bottom:22, width:3,
    background:`repeating-linear-gradient(180deg, ${COLORS.accent} 0 6px, transparent 6px 12px)`, borderRadius:2 },
  authBrand:{ marginBottom:4 },
  brandMark:{ fontFamily:FONT_DISPLAY, fontSize:"1.7rem", fontWeight:700, color:COLORS.ink },
  brandAccent:{ color:COLORS.accent },
  authSub:{ color:COLORS.muted, fontSize:"0.85rem", margin:"0 0 26px" },
  authTabs:{ display:"flex", border:`1px solid ${COLORS.line}`, borderRadius:8, overflow:"hidden", marginBottom:22 },
  authTab:{ flex:1, padding:"9px 0", textAlign:"center", background:COLORS.paperDim, color:COLORS.muted,
    fontSize:"0.82rem", fontWeight:600, letterSpacing:"0.02em", cursor:"pointer", border:"none" },
  authTabActive:{ background:COLORS.accent, color:"#fff" },
  authField:{ marginBottom:14 },
  authLabel:{ display:"block", fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.06em", color:COLORS.muted, marginBottom:5 },
  authInput:{ width:"100%", padding:"10px 12px", border:`1px solid ${COLORS.line}`, borderRadius:7, fontSize:"0.92rem", background:COLORS.paper, boxSizing:"border-box" },
  authError:{ fontSize:"0.8rem", color:COLORS.bad, background:COLORS.badSoft, borderRadius:6, padding:"8px 10px", marginBottom:14 },
  authSubmit:{ width:"100%", background:COLORS.ink, color:"#fff", fontWeight:600, fontSize:"0.92rem", padding:"11px 0", borderRadius:7, marginTop:6, cursor:"pointer", border:"none" },
  authHint:{ textAlign:"center", fontSize:"0.72rem", color:COLORS.muted, marginTop:16, lineHeight:1.5 },

  appRoot:{ fontFamily:FONT_BODY, color:COLORS.ink, background:COLORS.paper, minHeight:"100vh" },
  shell:{ display:"flex", minHeight:"100vh" },
  sidebar:{ width:220, flexShrink:0, background:COLORS.ink, color:"#f2f0e6", display:"flex", flexDirection:"column" },
  sidebarBrand:{ padding:"22px 20px 16px", borderBottom:"1px solid rgba(242,240,230,0.12)" },
  sidebarMark:{ fontFamily:FONT_DISPLAY, fontSize:"1.25rem", fontWeight:700 },
  sidebarTag:{ display:"block", fontSize:"0.68rem", color:"#a8ab9c", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:2 },
  sidebarNav:{ padding:"14px 10px", flex:1 },
  navItem:{ display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left", background:"transparent",
    color:"#d7d6c9", padding:"10px 12px", borderRadius:7, fontSize:"0.88rem", marginBottom:3, border:"none", cursor:"pointer" },
  navItemActive:{ background:COLORS.accent, color:"#fff", fontWeight:600 },
  sidebarUser:{ padding:"16px 18px", borderTop:"1px solid rgba(242,240,230,0.12)", fontSize:"0.78rem" },
  sidebarWho:{ color:"#f2f0e6", fontWeight:600, marginBottom:2 },
  sidebarRole:{ color:"#a8ab9c", marginBottom:10 },
  logoutBtn:{ width:"100%", background:"rgba(242,240,230,0.1)", color:"#f2f0e6", padding:"7px 0", borderRadius:6, fontSize:"0.78rem", border:"none", cursor:"pointer" },

  content:{ flex:1, padding:"26px 32px 60px", maxWidth:1180 },
  pageHead:{ marginBottom:20 },
  h1:{ fontFamily:FONT_DISPLAY, fontWeight:600, fontSize:"1.5rem", margin:"0 0 4px" },
  pageSub:{ color:COLORS.muted, fontSize:"0.85rem", margin:0 },

  grid2:{ display:"grid", gridTemplateColumns:"1.05fr 1.4fr", gap:18, alignItems:"start" },

  card:{ background:COLORS.card, border:`1px solid ${COLORS.line}`, borderRadius:10, padding:"18px 20px", marginBottom:18 },
  cardH2:{ fontFamily:FONT_DISPLAY, fontWeight:600, margin:"0 0 14px", fontSize:"1rem", borderBottom:`1px solid ${COLORS.line}`, paddingBottom:9 },

  label:{ display:"block", fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.04em", color:COLORS.muted, margin:"10px 0 4px" },
  input:{ width:"100%", padding:"8px 10px", border:`1px solid ${COLORS.line}`, borderRadius:6, fontSize:"0.9rem", background:COLORS.paper, boxSizing:"border-box", fontFamily:FONT_BODY },
  row2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  btnPrimary:{ background:COLORS.accent, color:"#fff", width:"100%", marginTop:14, fontWeight:600, padding:"10px 14px", fontSize:"0.9rem", border:"none", borderRadius:6, cursor:"pointer" },
  btnSecondary:{ background:COLORS.paperDim, color:COLORS.ink, padding:"8px 13px", fontSize:"0.82rem", border:"none", borderRadius:6, cursor:"pointer" },
  btnDanger:{ background:"transparent", color:COLORS.bad, padding:"4px 8px", fontSize:"0.78rem", border:"none", cursor:"pointer" },
  btnStar:{ background:"transparent", padding:"4px 6px", fontSize:"0.95rem", border:"none", cursor:"pointer" },
  hint:{ fontSize:"0.74rem", color:COLORS.muted, marginTop:6, lineHeight:1.4 },

  table:{ width:"100%", borderCollapse:"collapse", fontSize:"0.85rem" },
  th:{ textAlign:"left", padding:"8px 6px", borderBottom:`1px solid ${COLORS.line}`, color:COLORS.muted, fontWeight:600, fontSize:"0.7rem", textTransform:"uppercase", letterSpacing:"0.04em" },
  td:{ textAlign:"left", padding:"8px 6px", borderBottom:`1px solid ${COLORS.line}` },
  mono:{ fontFamily:FONT_MONO },
  tag:{ display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:"0.7rem", background:COLORS.accentSoft, color:COLORS.accentDark },
  recurringTag:{ background:COLORS.warnSoft, color:"#8a5f0f", marginLeft:6 },

  summaryGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 },
  summaryBox:{ background:COLORS.paperDim, border:`1px solid ${COLORS.line}`, borderRadius:8, padding:"12px 10px", textAlign:"center" },
  summaryVal:{ fontFamily:FONT_MONO, fontSize:"1.2rem", fontWeight:700 },
  summaryLbl:{ fontSize:"0.68rem", color:COLORS.muted, textTransform:"uppercase", letterSpacing:"0.04em", marginTop:2 },

  insight:{ padding:"10px 12px", borderRadius:8, fontSize:"0.85rem", marginBottom:8, borderLeft:`4px solid ${COLORS.accent}`, background:COLORS.accentSoft },
  insightWarn:{ borderLeftColor:COLORS.warn, background:COLORS.warnSoft },
  insightGood:{ borderLeftColor:COLORS.good, background:COLORS.accentSoft },

  toolbar:{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" },
  empty:{ color:COLORS.muted, fontSize:"0.85rem", padding:"14px 0", textAlign:"center" },

  budgetItem:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:10, fontSize:"0.85rem" },
  budgetBarBg:{ background:COLORS.paperDim, borderRadius:6, height:8, width:"100%", overflow:"hidden", marginTop:4 },
  budgetBarFill:{ height:"100%" },

  serviceCard:{ border:`1px solid ${COLORS.line}`, borderRadius:9, padding:"12px 14px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.paperDim },
  serviceName:{ fontWeight:600, fontSize:"0.9rem" },
  serviceMeta:{ fontSize:"0.74rem", color:COLORS.muted, marginTop:2 },

  footer:{ textAlign:"center", color:COLORS.muted, fontSize:"0.72rem", padding:"10px 20px 30px" },
};
