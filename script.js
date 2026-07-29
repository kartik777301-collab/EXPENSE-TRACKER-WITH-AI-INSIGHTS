const USERS_KEY = "ledgerlineUsers_v1";
const SESSION_KEY = "ledgerlineSession_v1";

function loadUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); }
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

// Not real crypto — just obfuscates plaintext for this local demo.
function simpleHash(str){
  let hash = 0;
  for(let i=0;i<str.length;i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36) + "_" + str.length;
}

function showAuthError(msg){
  const el = document.getElementById("authError");
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}

const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

tabLogin.addEventListener("click", ()=>{
  tabLogin.classList.add("active"); tabSignup.classList.remove("active");
  loginForm.style.display = "block"; signupForm.style.display = "none";
  showAuthError("");
});
tabSignup.addEventListener("click", ()=>{
  tabSignup.classList.add("active"); tabLogin.classList.remove("active");
  signupForm.style.display = "block"; loginForm.style.display = "none";
  showAuthError("");
});

loginForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const users = loadUsers();
  if(!users[username]){ showAuthError("No account found with that username."); return; }
  if(users[username].passwordHash !== simpleHash(password)){ showAuthError("Incorrect password."); return; }
  showAuthError("");
  startSession(username);
});

signupForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const password2 = document.getElementById("signupPassword2").value;
  if(username.length < 2){ showAuthError("Username must be at least 2 characters."); return; }
  if(password.length < 4){ showAuthError("Password must be at least 4 characters."); return; }
  if(password !== password2){ showAuthError("Passwords don't match."); return; }
  const users = loadUsers();
  if(users[username]){ showAuthError("That username is already taken."); return; }
  users[username] = { passwordHash: simpleHash(password), createdAt: new Date().toISOString() };
  saveUsers(users);
  showAuthError("");
  startSession(username);
});

document.getElementById("logoutBtn").addEventListener("click", ()=>{
  localStorage.removeItem(SESSION_KEY);
  document.getElementById("appScreen").style.display = "none";
  document.getElementById("authScreen").style.display = "flex";
  loginForm.reset(); signupForm.reset();
});

function startSession(username){
  localStorage.setItem(SESSION_KEY, username);
  enterApp(username);
}

function enterApp(username){
  currentUsername = username;
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";
  document.getElementById("sidebarUsername").textContent = username;
  loadUserData();
  renderAll();
}

// Auto-login if a session already exists
let currentUsername = null;
const existingSession = localStorage.getItem(SESSION_KEY);


document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const page = btn.dataset.page;
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
  });
});


const CATEGORIES = ["Food","Transport","Utilities","Entertainment","Shopping","Health","Subscriptions","Other"];

let expenses = [];
let budgets = {};
let savedIds = [];

function keyFor(base){ return `ledgerline_${base}_${currentUsername}`; }

function loadUserData(){
  expenses = JSON.parse(localStorage.getItem(keyFor("expenses")) || "[]");
  budgets = JSON.parse(localStorage.getItem(keyFor("budgets")) || "{}");
  savedIds = JSON.parse(localStorage.getItem(keyFor("saved")) || "[]");
  renderBudgetInputs();
}

function saveExpenses(){ localStorage.setItem(keyFor("expenses"), JSON.stringify(expenses)); }
function saveBudgets(){ localStorage.setItem(keyFor("budgets"), JSON.stringify(budgets)); }
function saveSavedIds(){ localStorage.setItem(keyFor("saved"), JSON.stringify(savedIds)); }


const KEYWORD_MAP = {
  Food: ["restaurant","cafe","coffee","starbucks","pizza","food","grocery","supermarket","diner","burger","bakery","zomato","swiggy"],
  Transport: ["uber","lyft","taxi","fuel","gas","petrol","metro","bus","train","parking","ola"],
  Utilities: ["electric","water bill","internet","wifi","phone bill","utility","gas bill","broadband"],
  Entertainment: ["netflix","movie","cinema","concert","spotify","game","theatre","hulu","disney+"],
  Shopping: ["amazon","mall","clothing","shoes","electronics","store","shopping","flipkart"],
  Health: ["pharmacy","doctor","hospital","clinic","medicine","gym","fitness","dental"],
  Subscriptions: ["subscription","membership","monthly plan","annual plan","prime","icloud"]
};

function autoCategorize(desc){
  const d = desc.toLowerCase();
  for(const [cat, keywords] of Object.entries(KEYWORD_MAP)){
    if(keywords.some(k => d.includes(k))) return cat;
  }
  return "Other";
}


document.getElementById("date").valueAsDate = new Date();

const catSelect = document.getElementById("category");
const filterSelect = document.getElementById("filterCategory");
CATEGORIES.forEach(c=>{
  filterSelect.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`);
});

document.getElementById("merchant").addEventListener("input", (e)=>{
  const hint = document.getElementById("autoTagHint");
  if(catSelect.value === "" && e.target.value.trim().length > 2){
    hint.style.display = "inline";
  } else {
    hint.style.display = "none";
  }
});

document.getElementById("expenseForm").addEventListener("submit", function(e){
  e.preventDefault();
  const merchant = document.getElementById("merchant").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  let category = document.getElementById("category").value;

  if(!merchant || isNaN(amount) || !date) return;
  if(!category) category = autoCategorize(merchant);

  expenses.push({ id: Date.now(), merchant, amount, date, category });
  saveExpenses();

  this.reset();
  document.getElementById("date").valueAsDate = new Date();
  document.getElementById("autoTagHint").style.display = "none";

  renderAll();
});


function renderBudgetInputs(){
  const box = document.getElementById("budgetInputs");
  box.innerHTML = CATEGORIES.map(c => `
    <div class="row2" style="align-items:end;margin-bottom:6px;">
      <label style="margin:0;">${c}</label>
      <input type="number" min="0" step="1" placeholder="No limit"
        value="${budgets[c] ?? ''}" data-cat="${c}" class="budget-input">
    </div>
  `).join("");

  box.querySelectorAll(".budget-input").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const cat = e.target.dataset.cat;
      const val = parseFloat(e.target.value);
      if(!isNaN(val) && val > 0){ budgets[cat] = val; }
      else { delete budgets[cat]; }
      saveBudgets();
      renderAll();
    });
  });
}


let categoryChart, trendChart;

function currentMonthKey(){ const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; }
function monthKeyOf(dateStr){ const d = new Date(dateStr); return `${d.getFullYear()}-${d.getMonth()}`; }

function recurringCounts(){
  const counts = {};
  expenses.forEach(e=>{
    const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
    counts[key] = (counts[key]||0) + 1;
  });
  return counts;
}

function renderTable(){
  const filter = filterSelect.value;
  const tbody = document.getElementById("expenseTableBody");
  const sorted = [...expenses].sort((a,b)=> new Date(b.date) - new Date(a.date));
  const filtered = filter ? sorted.filter(e=>e.category===filter) : sorted;
  const counts = recurringCounts();

  document.getElementById("tableEmpty").style.display = filtered.length ? "none" : "block";

  tbody.innerHTML = filtered.map(e=>{
    const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
    const isRecurring = counts[key] >= 2;
    const isSaved = savedIds.includes(e.id);
    return `
      <tr>
        <td><button class="btn-star ${isSaved ? 'saved':''}" onclick="toggleSaved(${e.id})" title="${isSaved ? 'Remove from Saved' : 'Save this transaction'}">★</button></td>
        <td>${e.date}</td>
        <td>${e.merchant} ${isRecurring ? '<span class="tag recurring-tag">recurring</span>' : ''}</td>
        <td><span class="tag">${e.category}</span></td>
        <td class="amt num">$${e.amount.toFixed(2)}</td>
        <td><button class="btn-danger" onclick="deleteExpense(${e.id})">Delete</button></td>
      </tr>`;
  }).join("");
}

function toggleSaved(id){
  if(savedIds.includes(id)){ savedIds = savedIds.filter(x=>x!==id); }
  else { savedIds.push(id); }
  saveSavedIds();
  renderAll();
}

function renderSaved(){
  const tbody = document.getElementById("savedTableBody");
  const savedExpenses = expenses.filter(e=>savedIds.includes(e.id))
    .sort((a,b)=> new Date(b.date) - new Date(a.date));

  document.getElementById("savedEmpty").style.display = savedExpenses.length ? "none" : "block";

  tbody.innerHTML = savedExpenses.map(e=> `
    <tr>
      <td><button class="btn-star saved" onclick="toggleSaved(${e.id})" title="Remove from Saved">★</button></td>
      <td>${e.date}</td>
      <td>${e.merchant}</td>
      <td><span class="tag">${e.category}</span></td>
      <td class="amt num">$${e.amount.toFixed(2)}</td>
    </tr>`).join("");
}

function deleteExpense(id){
  expenses = expenses.filter(e=>e.id !== id);
  savedIds = savedIds.filter(x=>x!==id);
  saveExpenses();
  saveSavedIds();
  renderAll();
}

function renderSummary(){
  const key = currentMonthKey();
  const monthExpenses = expenses.filter(e=>monthKeyOf(e.date)===key);
  const total = monthExpenses.reduce((s,e)=>s+e.amount,0);
  const count = monthExpenses.length;
  const avg = count ? total/count : 0;

  document.getElementById("totalThisMonth").textContent = "$" + total.toFixed(2);
  document.getElementById("txnCount").textContent = count;
  document.getElementById("avgTxn").textContent = "$" + avg.toFixed(2);
}

function renderCategoryChart(){
  const key = currentMonthKey();
  const monthExpenses = expenses.filter(e=>monthKeyOf(e.date)===key);
  const totals = {};
  monthExpenses.forEach(e=>{ totals[e.category] = (totals[e.category]||0) + e.amount; });

  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = ["#1f8a70","#c98a2c","#c0392b","#5b7fd6","#9b59d0","#2c9c9c","#d67e3c","#8a8674"];

  const ctx = document.getElementById("categoryChart");
  if(categoryChart) categoryChart.destroy();

  if(labels.length === 0){
    ctx.getContext("2d").clearRect(0,0,ctx.width,ctx.height);
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets:[{ data, backgroundColor: colors }]},
    options: { plugins:{ legend:{ position:"bottom", labels:{ font:{size:11} } } } }
  });
}

function renderTrendChart(){
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

  const ctx = document.getElementById("trendChart");
  if(trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: days.map(d=>d.slice(5)),
      datasets: [{ label:"Spend", data: days.map(d=>totalsByDay[d]), backgroundColor:"#1f8a70" }]
    },
    options: {
      plugins:{ legend:{ display:false } },
      scales:{ x:{ ticks:{ maxRotation:90, minRotation:90, font:{size:9} } } }
    }
  });
}

function renderInsights(){
  const box = document.getElementById("insightsBox");
  if(expenses.length < 3){
    box.innerHTML = '<p class="empty">Add a few expenses to unlock forecasts and insights.</p>';
    return;
  }

  const byMonth = {};
  expenses.forEach(e=>{ const k = monthKeyOf(e.date); byMonth[k] = (byMonth[k]||0) + e.amount; });
  const months = Object.keys(byMonth).sort();
  const values = months.map(m=>byMonth[m]);

  let html = "";

  if(values.length >= 2){
    const recent = values.slice(-3);
    const forecast = recent.reduce((s,v,i)=> s + v*(i+1), 0) / recent.reduce((s,_,i)=>s+(i+1),0);
    html += `<div class="insight">📈 Based on recent months, projected spend next month is roughly <strong>$${forecast.toFixed(2)}</strong>.</div>`;

    const lastMonth = values[values.length-1];
    const prevMonth = values[values.length-2];
    if(prevMonth > 0){
      const change = ((lastMonth - prevMonth)/prevMonth*100);
      if(change > 10){
        html += `<div class="insight warn">⚠️ Spending increased by ${change.toFixed(0)}% compared to the previous month.</div>`;
      } else if(change < -10){
        html += `<div class="insight good">✅ Nice, spending dropped ${Math.abs(change).toFixed(0)}% compared to the previous month.</div>`;
      }
    }
  } else {
    html += `<div class="insight">📈 Keep logging expenses across a couple of months to unlock a spending forecast.</div>`;
  }

  const key = currentMonthKey();
  const monthExpenses = expenses.filter(e=>monthKeyOf(e.date)===key);
  const catTotals = {};
  monthExpenses.forEach(e=>{ catTotals[e.category] = (catTotals[e.category]||0)+e.amount; });
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if(topCat){
    html += `<div class="insight">🏷️ Your top spending category this month is <strong>${topCat[0]}</strong> at $${topCat[1].toFixed(2)}.</div>`;
  }

  const counts = recurringCounts();
  const recurringCount = Object.values(counts).filter(c=>c>=2).length;
  if(recurringCount > 0){
    html += `<div class="insight">🔁 Detected ${recurringCount} likely recurring charge${recurringCount>1?'s':''}. See the Services page for details.</div>`;
  }

  box.innerHTML = html;
}

function renderBudgets(){
  const box = document.getElementById("budgetStatus");
  const key = currentMonthKey();
  const monthExpenses = expenses.filter(e=>monthKeyOf(e.date)===key);
  const catTotals = {};
  monthExpenses.forEach(e=>{ catTotals[e.category] = (catTotals[e.category]||0)+e.amount; });

  const activeBudgets = Object.entries(budgets);
  if(activeBudgets.length === 0){
    box.innerHTML = '<p class="empty">No budgets set yet. Set one on the left to see alerts here.</p>';
    return;
  }

  box.innerHTML = activeBudgets.map(([cat, limit])=>{
    const spent = catTotals[cat] || 0;
    const pct = Math.min(100, (spent/limit)*100);
    let barColor = "var(--good)";
    let note = "";
    if(pct >= 100){ barColor = "var(--bad)"; note = " — over budget!"; }
    else if(pct >= 80){ barColor = "var(--warn)"; note = " — approaching limit"; }

    return `
      <div class="budget-item">
        <div style="flex:1;">
          <div>${cat}: <span class="num">$${spent.toFixed(2)} / $${limit.toFixed(2)}</span>${note}</div>
          <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
        </div>
      </div>`;
  }).join("");
}

function renderServices(){
  const box = document.getElementById("servicesList");
  const counts = recurringCounts();
  // Build one entry per recurring merchant+amount pair, using the most recent occurrence
  const seen = {};
  expenses.forEach(e=>{
    const key = e.merchant.toLowerCase() + "_" + Math.round(e.amount);
    if(counts[key] >= 2){
      if(!seen[key] || new Date(e.date) > new Date(seen[key].date)){ seen[key] = e; }
    }
  });
  const services = Object.entries(seen);

  if(services.length === 0){
    box.innerHTML = '<p class="empty">No recurring charges detected yet. These show up once a merchant + amount repeats at least twice.</p>';
    return;
  }

  box.innerHTML = services.map(([key, e])=>{
    const timesSeen = counts[key];
    return `
      <div class="service-card">
        <div>
          <div class="name">${e.merchant}</div>
          <div class="meta">${e.category} · seen ${timesSeen} times · last charge ${e.date}</div>
        </div>
        <div class="amt num">$${e.amount.toFixed(2)}</div>
      </div>`;
  }).join("");
}

function renderAll(){
  renderTable();
  renderSummary();
  renderCategoryChart();
  renderTrendChart();
  renderInsights();
  renderBudgets();
  renderServices();
  renderSaved();
}

filterSelect.addEventListener("change", renderTable);


document.getElementById("exportCsvBtn").addEventListener("click", ()=>{
  if(expenses.length === 0){ alert("No transactions to export yet."); return; }
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
});


if(existingSession && loadUsers()[existingSession]){
  enterApp(existingSession);
}
