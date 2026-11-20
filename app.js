import { createClient } from "@supabase/supabase-js";
import { calculate } from "./calculator.js";
import { getInitials } from "./profile.js";
import "./advisor.js";

const STORAGE_KEY = "pera-diary-transactions-v1";
const AVATAR_BUCKET = "profile-avatars";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const categories = {
  expense: ["Food & drink", "Shopping", "Transport", "Bills", "Entertainment", "Health", "Other"],
  income: ["Salary", "Freelance", "Investments", "Gift", "Other"]
};
const categoryStyles = {
  "Food & drink": { icon: "◒", color: "orange" },
  Shopping: { icon: "◇", color: "violet" },
  Transport: { icon: "↗", color: "blue" },
  Bills: { icon: "▤", color: "pink" },
  Entertainment: { icon: "♫", color: "yellow" },
  Health: { icon: "✚", color: "green" },
  Salary: { icon: "↙", color: "green" },
  Freelance: { icon: "✳", color: "violet" },
  Investments: { icon: "⌁", color: "blue" },
  Gift: { icon: "♡", color: "pink" },
  Other: { icon: "•", color: "violet" }
};
const budgetDefinitions = [
  { category: "Food & drink", label: "Food & drink", limit: 0, color: "#f0af72" },
  { category: "Shopping", label: "Shopping", limit: 0, color: "#8b7bed" },
  { category: "Transport", label: "Transport", limit: 0, color: "#69a9dd" }
];

const $ = (selector) => document.querySelector(selector);
const CURRENCY_KEY = "pera-diary-currency-v1";
const THEME_KEY = "pera-diary-theme-v1";
const currencySymbols = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", PHP: "₱" };
let selectedCurrency = localStorage.getItem(CURRENCY_KEY) || "USD";
let selectedTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
let currency = new Intl.NumberFormat("en-US", { style: "currency", currency: selectedCurrency });
let supabaseUser = null;
let authMode = "signin";
let profileDisplayName = "";
let profileAvatarPath = "";
let profileAvatarUrl = "";
let pendingAvatarUrl = null;
let calculatorDisplay = "0";
let calculatorStoredValue = null;
let calculatorOperator = null;
let calculatorWaitingForOperand = false;
let calculatorTrigger = null;
document.documentElement.dataset.theme = selectedTheme;

function updateThemeButton() {
  const darkMode = selectedTheme === "dark";
  const button = $("#theme-toggle");
  button.setAttribute("aria-label", darkMode ? "Switch to light mode" : "Switch to dark mode");
  button.setAttribute("aria-pressed", String(darkMode));
  document.querySelector('meta[name="theme-color"]').content = darkMode ? "#17161c" : "#24242a";
}

function setTheme(theme) {
  selectedTheme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateThemeButton();
}

function renderCalculator() {
  $("#calculator-display").textContent = calculatorDisplay;
}

function formatCalculatorResult(value) {
  return String(Number(value.toPrecision(10)));
}

function resetCalculator() {
  calculatorDisplay = "0";
  calculatorStoredValue = null;
  calculatorOperator = null;
  calculatorWaitingForOperand = false;
  renderCalculator();
}

function calculatorError(error) {
  calculatorDisplay = "Error";
  calculatorStoredValue = null;
  calculatorOperator = null;
  calculatorWaitingForOperand = true;
  $("#calculator-display").setAttribute("aria-label", error.message);
  renderCalculator();
}

function clearCalculatorError() {
  $("#calculator-display").setAttribute("aria-label", "Calculator display");
}

function calculatePendingOperation() {
  calculatorDisplay = formatCalculatorResult(
    calculate(calculatorStoredValue, calculatorOperator, Number(calculatorDisplay))
  );
  calculatorStoredValue = Number(calculatorDisplay);
}

function handleCalculatorAction(action) {
  if (action === "clear") {
    clearCalculatorError();
    resetCalculator();
    return;
  }
  if (calculatorDisplay === "Error") resetCalculator();

  if (/^\d$/.test(action)) {
    clearCalculatorError();
    if (calculatorWaitingForOperand) {
      calculatorDisplay = action;
      calculatorWaitingForOperand = false;
    } else if (calculatorDisplay.replace(/[-.]/g, "").length < 14) {
      calculatorDisplay = calculatorDisplay === "0" ? action : `${calculatorDisplay}${action}`;
    }
    renderCalculator();
    return;
  }

  if (action === "decimal") {
    clearCalculatorError();
    if (calculatorWaitingForOperand) {
      calculatorDisplay = "0.";
      calculatorWaitingForOperand = false;
    } else if (!calculatorDisplay.includes(".")) {
      calculatorDisplay += ".";
    }
    renderCalculator();
    return;
  }

  if (action === "sign") {
    if (calculatorDisplay !== "0" && calculatorDisplay !== "Error") {
      calculatorDisplay = calculatorDisplay.startsWith("-")
        ? calculatorDisplay.slice(1)
        : `-${calculatorDisplay}`;
      renderCalculator();
    }
    return;
  }

  if (action === "backspace") {
    if (!calculatorWaitingForOperand) {
      calculatorDisplay = calculatorDisplay.length <= 1 || calculatorDisplay.length === 2 && calculatorDisplay.startsWith("-")
        ? "0"
        : calculatorDisplay.slice(0, -1);
      renderCalculator();
    }
    return;
  }

  if (["+","-","*","/"].includes(action)) {
    clearCalculatorError();
    if (calculatorOperator && !calculatorWaitingForOperand) {
      try {
        calculatePendingOperation();
      } catch (error) {
        calculatorError(error);
        return;
      }
    } else {
      calculatorStoredValue = Number(calculatorDisplay);
    }
    calculatorOperator = action;
    calculatorWaitingForOperand = true;
    renderCalculator();
    return;
  }

  if (action === "equals" && calculatorOperator && calculatorStoredValue !== null) {
    try {
      clearCalculatorError();
      calculatePendingOperation();
      calculatorOperator = null;
      calculatorStoredValue = null;
      calculatorWaitingForOperand = true;
      renderCalculator();
    } catch (error) {
      calculatorError(error);
    }
  }
}

function openCalculator(event) {
  calculatorTrigger = event.currentTarget;
  $("#calculator-backdrop").hidden = false;
  document.body.style.overflow = "hidden";
  $("#calculator-backdrop").querySelector("[data-calculator-action]").focus();
}

function closeCalculator() {
  $("#calculator-backdrop").hidden = true;
  document.body.style.overflow = "";
  if (calculatorTrigger) calculatorTrigger.focus();
}

async function refreshCurrency() {
  selectedCurrency = $("#currency-select").value;
  localStorage.setItem(CURRENCY_KEY, selectedCurrency);
  currency = new Intl.NumberFormat("en-US", { style: "currency", currency: selectedCurrency });
  $("#amount-currency-symbol").textContent = currencySymbols[selectedCurrency] || selectedCurrency;
  renderSummary();
  renderTransactions();
  if (supabaseUser && supabase) {
    const { error } = await supabase.from("profiles").upsert({
      id: supabaseUser.id,
      currency: selectedCurrency
    });
    if (error) showAppStatus(`Could not save your currency: ${error.message}`);
  }
}
const today = new Date();
const dateOnly = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};
function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { transactions: [], error: null };
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every((item) =>
      item && typeof item.id === "string" && typeof item.description === "string" &&
      typeof item.category === "string" && ["income", "expense"].includes(item.type) &&
      Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    )) throw new Error("Saved transactions have an unexpected format.");
    return { transactions: parsed, error: null };
  } catch (error) {
    console.error("Could not load saved transactions.", error);
    return { transactions: [], error };
  }
}

const savedTransactions = loadTransactions();
let transactions = savedTransactions.transactions;
let activeFilter = "all";
let balanceHidden = false;

function monthTransactions(date = today) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return transactions.filter((item) => {
    const transactionDate = new Date(`${item.date}T12:00:00`);
    return transactionDate.getMonth() === month && transactionDate.getFullYear() === year;
  });
}

function totalFor(items, type) {
  return items.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
}

function showAppStatus(message) {
  const element = $("#app-status");
  element.textContent = message;
  element.hidden = !message;
}

function renderSummary() {
  const income = totalFor(transactions, "income");
  const expenses = totalFor(transactions, "expense");
  const thisMonth = monthTransactions();
  const monthIncome = totalFor(thisMonth, "income");
  const monthExpenses = totalFor(thisMonth, "expense");

  $("#balance-total").textContent = currency.format(income - expenses);
  $("#income-total").textContent = currency.format(income);
  $("#expense-total").textContent = currency.format(expenses);
  $("#month-income").textContent = currency.format(monthIncome);
  $("#month-expenses").textContent = currency.format(monthExpenses);
  updateBalanceVisibility();
  renderChart();
  renderBudgets(thisMonth);
}

function renderChart() {
  const chart = $("#spending-chart");
  const period = $("#chart-period").value;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const count = period === "week" ? 7 : daysInMonth;
  const totals = Array(count).fill(0);
  const rangeStart = period === "week"
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - count + 1)
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const inRange = transactions.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return item.type === "expense" && date >= new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()) &&
      date <= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  });

  inRange.forEach((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    const index = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
    const slot = period === "week" ? count - 1 - index : date.getDate() - 1;
    if (slot >= 0 && slot < count) totals[slot] += item.amount;
  });

  const visibleTotals = period === "week" ? totals : totals.slice(0, today.getDate());
  const slots = period === "week"
    ? totals.map((amount, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - index));
      return { amount, label: date.toLocaleDateString("en-US", { weekday: "short" }) };
    })
    :
    Array.from({ length: 7 }, (_, index) => {
      const start = Math.floor(index * count / 7);
      const end = Math.floor((index + 1) * count / 7);
      return {
        amount: totals.slice(start, end).reduce((sum, value) => sum + value, 0),
        label: String(end)
      };
    });
  const max = Math.max(...slots.map((slot) => slot.amount), 1);
  const points = slots.map((slot, index) => ({
    x: 28 + index * 97,
    y: 112 - (slot.amount ? Math.max(8, slot.amount / max * 75) : 0)
  }));
  const smoothPath = (values) => values.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = values[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} Q ${previous.x} ${previous.y} ${middle} ${(previous.y + point.y) / 2}${index === values.length - 1 ? ` T ${point.x} ${point.y}` : ""}`;
  }, "");
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} 132 L ${points[0].x} 132 Z`;
  chart.innerHTML = `
    <svg class="chart-visual" viewBox="0 0 640 148" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="chart-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f8a6c4" stop-opacity=".42"/><stop offset="100%" stop-color="#f8a6c4" stop-opacity="0"/></linearGradient></defs>
      <path class="chart-gridline" d="M 0 36 H 640 M 0 76 H 640 M 0 116 H 640"/>
      <path class="chart-area" d="${areaPath}"/>
      <path class="chart-line" d="${linePath}"/>
      ${points.map((point, index) => slots[index].amount ? `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"/>` : "").join("")}
    </svg>
    <div class="chart-labels">${slots.map((slot) => `<span>${escapeHtml(slot.label)}</span>`).join("")}</div>`;
  chart.setAttribute("aria-label", `${period === "week" ? "Daily spending this week" : "Spending this month"}: ${currency.format(totals.reduce((sum, value) => sum + value, 0))}`);
  $("#chart-total").textContent = currency.format(period === "week"
    ? totals.reduce((sum, value) => sum + value, 0)
    : visibleTotals.reduce((sum, value) => sum + value, 0));
}

function renderBudgets(items = monthTransactions()) {
  $("#budget-list").innerHTML = budgetDefinitions.map((budget) => {
    const spent = items.filter((item) => item.type === "expense" && item.category === budget.category)
      .reduce((sum, item) => sum + item.amount, 0);
    const progress = budget.limit > 0 ? Math.min(spent / budget.limit * 100, 100) : 0;
    return `<div class="budget-row">
      <span class="budget-name"><i class="budget-dot" style="background:${budget.color}"></i>${escapeHtml(budget.label)}</span>
      <span class="budget-numbers"><strong>${currency.format(spent)}</strong> / ${currency.format(budget.limit)}</span>
      <div class="budget-track" role="progressbar" aria-label="${escapeHtml(budget.label)} budget" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100">
        <div class="budget-fill" style="--bar-color:${budget.color};width:${progress}%"></div>
      </div>
    </div>`;
  }).join("");
}

function formatTransactionDate(value) {
  const date = new Date(`${value}T12:00:00`);
  const now = new Date();
  const difference = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
    new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderTransactions() {
  const query = $("#transaction-search").value.trim().toLowerCase();
  const items = [...transactions]
    .filter((item) => activeFilter === "all" || item.type === activeFilter)
    .filter((item) => !query || `${item.description} ${item.category}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const list = $("#transaction-list");
  if (items.length === 0) {
    list.innerHTML = `<p class="empty-state">${query ? "No transactions match your search." : "No transactions here yet."}</p>`;
    return;
  }
  list.innerHTML = items.map((item) => {
    const style = categoryStyles[item.category] || categoryStyles.Other;
    const amountPrefix = item.type === "income" ? "+" : "−";
    return `<div class="transaction-row">
      <span class="transaction-icon" data-color="${style.color}" aria-hidden="true">${style.icon}</span>
      <span class="transaction-name">${escapeHtml(item.description)}<span class="transaction-category">${escapeHtml(item.category)}</span></span>
      <span class="transaction-date">${formatTransactionDate(item.date)}</span>
      <span class="transaction-amount ${item.type}">${amountPrefix}${currency.format(item.amount)}</span>
    </div>`;
  }).join("");
}

function appendAdvisorMessage(kind, text) {
  const message = document.createElement("div");
  message.className = `advisor-message ${kind}`;
  message.textContent = text;
  $("#advisor-messages").append(message);
  $("#advisor-messages").scrollTop = $("#advisor-messages").scrollHeight;
}

function resetAdvisorConversation() {
  $("#advisor-messages").replaceChildren();
  appendAdvisorMessage("assistant", "Hi! I can help review your logged spending and cash flow. Your transactions are analyzed in this browser and aren’t sent to an AI model. I can’t provide investment, tax, or legal advice.");
}

let advisorTrigger = null;
function openAdvisor(event) {
  advisorTrigger = event.currentTarget;
  $("#advisor-backdrop").hidden = false;
  document.body.style.overflow = "hidden";
  $("#advisor-question").focus();
}

function closeAdvisor() {
  $("#advisor-backdrop").hidden = true;
  document.body.style.overflow = "";
  if (advisorTrigger) advisorTrigger.focus();
}

function askAdvisor(question) {
  const value = question.trim();
  if (!value) return;
  appendAdvisorMessage("user", value);
  appendAdvisorMessage("assistant", window.advisorReply(value, transactions, today, selectedCurrency));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function updateCategories() {
  const type = document.querySelector('input[name="type"]:checked').value;
  $("#category-input").innerHTML = categories[type].map((category) =>
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
  ).join("");
}

function openModal() {
  const backdrop = $("#modal-backdrop");
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  $("#transaction-form").elements.amount.focus();
}

function closeModal() {
  $("#modal-backdrop").hidden = true;
  document.body.style.overflow = "";
}

function updateBalanceVisibility() {
  const button = $("#toggle-balance");
  button.setAttribute("aria-label", balanceHidden ? "Show balance" : "Hide balance");
  $("#balance-total").textContent = balanceHidden ? "••••••" :
    currency.format(totalFor(transactions, "income") - totalFor(transactions, "expense"));
}

$("#today-label").textContent = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
$("#transaction-form").elements.date.value = dateOnly(today);
$("#currency-select").value = selectedCurrency;
$("#amount-currency-symbol").textContent = currencySymbols[selectedCurrency] || selectedCurrency;
updateThemeButton();
updateCategories();

$("#open-modal").addEventListener("click", openModal);
$("#mobile-add").addEventListener("click", openModal);
$("#theme-toggle").addEventListener("click", () => {
  setTheme(selectedTheme === "dark" ? "light" : "dark");
});
$("#open-calculator").addEventListener("click", openCalculator);
$("#close-calculator").addEventListener("click", closeCalculator);
$("#calculator-backdrop").addEventListener("click", (event) => {
  if (event.target === $("#calculator-backdrop")) closeCalculator();
});
document.querySelectorAll("[data-calculator-action]").forEach((button) => {
  button.addEventListener("click", () => handleCalculatorAction(button.dataset.calculatorAction));
});
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (event) => {
  if (event.target === $("#modal-backdrop")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#calculator-backdrop").hidden) closeCalculator();
  if (event.key === "Escape" && !$("#modal-backdrop").hidden) closeModal();
});

document.querySelectorAll('input[name="type"]').forEach((input) => {
  input.addEventListener("change", updateCategories);
});
$("#transaction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return;
  const saveButton = form.querySelector('[type="submit"]');
  const transactionMessage = $("#transaction-message");
  saveButton.disabled = true;
  transactionMessage.hidden = true;
  try {
    const newTransaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      description: String(data.get("description")).trim(),
      category: String(data.get("category")),
      type: String(data.get("type")),
      amount: Math.round(amount * 100) / 100,
      date: String(data.get("date")),
      currency: selectedCurrency
    };
    let updatedTransactions;
    if (supabase && supabaseUser) {
      const { error } = await supabase.from("transactions").insert({
        id: newTransaction.id,
        user_id: supabaseUser.id,
        description: newTransaction.description,
        category: newTransaction.category,
        type: newTransaction.type,
        amount: newTransaction.amount,
        date: newTransaction.date,
        currency: newTransaction.currency
      });
      if (error) throw error;
      updatedTransactions = [...transactions, newTransaction];
    } else {
      updatedTransactions = [...transactions, newTransaction];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
    }
    transactions = updatedTransactions;
    showAppStatus("");
    renderSummary();
    renderTransactions();
    form.reset();
    form.elements.date.value = dateOnly(today);
    updateCategories();
    closeModal();
  } catch (error) {
    transactionMessage.textContent = `Could not save your transaction: ${error.message}`;
    transactionMessage.hidden = false;
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderTransactions();
  });
});
$("#chart-period").addEventListener("change", renderChart);
$("#search-toggle").addEventListener("click", () => {
  const field = $("#search-field");
  const opening = !field.classList.contains("visible");
  field.classList.toggle("visible", opening);
  if (opening) $("#transaction-search").focus();
  else {
    $("#transaction-search").value = "";
    renderTransactions();
  }
});
$("#transaction-search").addEventListener("input", renderTransactions);
$("#toggle-balance").addEventListener("click", () => {
  balanceHidden = !balanceHidden;
  updateBalanceVisibility();
});
$("#currency-select").addEventListener("change", refreshCurrency);
$("#open-advisor").addEventListener("click", openAdvisor);
$("#close-advisor").addEventListener("click", closeAdvisor);
$("#advisor-backdrop").addEventListener("click", (event) => {
  if (event.target === $("#advisor-backdrop")) closeAdvisor();
});
$("#advisor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  askAdvisor(form.elements.question.value);
  form.reset();
  $("#advisor-question").focus();
});
document.querySelectorAll("[data-advisor-prompt]").forEach((button) => {
  button.addEventListener("click", () => askAdvisor(button.dataset.advisorPrompt));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#advisor-backdrop").hidden) closeAdvisor();
});

if (savedTransactions.error) {
  showAppStatus("Saved transactions could not be loaded. Adding a transaction will replace the damaged local data.");
}

renderSummary();
renderTransactions();
resetAdvisorConversation();

function openAuth() {
  setAuthUi();
  $("#auth-backdrop").hidden = false;
  document.body.style.overflow = "hidden";
  (supabaseUser ? $("#profile-display-name") : $("#auth-email")).focus();
}

function closeAuth() {
  $("#auth-backdrop").hidden = true;
  document.body.style.overflow = "";
}

function setAuthUi() {
  const isSignedIn = Boolean(supabaseUser);
  const accountName = supabaseUser?.email?.split("@")[0] || "Account";
  const displayName = profileDisplayName || accountName;
  $("#auth-form").hidden = isSignedIn;
  $("#profile-form").hidden = !isSignedIn;
  $("#profile-name").textContent = isSignedIn ? displayName : "Local account";
  $("#profile-status").textContent = isSignedIn
    ? (supabaseUser.email || "Synced account")
    : (supabase ? "Sign in to sync" : "Saved on this device");
  $("#mobile-profile-label").textContent = isSignedIn ? displayName : "You";
  $("#mobile-profile").setAttribute("aria-label", isSignedIn ? `Open ${displayName}'s profile` : "Open your profile");
  $("#open-auth-top").setAttribute("aria-label", isSignedIn ? `Open ${displayName}'s profile` : "Open your profile");
  $("#profile-display-name").value = displayName;
  [$("#sidebar-avatar"), $("#open-auth-top"), $("#mobile-avatar"), $("#profile-photo-preview")]
    .forEach((avatar) => renderAvatar(avatar, isSignedIn ? displayName : "", profileAvatarUrl));
  $("#auth-title").textContent = isSignedIn ? "Your profile" : (authMode === "signup" ? "Create account" : "Sign in");
  $("#auth-submit").textContent = authMode === "signup" ? "Create account" : "Sign in";
  $("#auth-mode-toggle").textContent = authMode === "signup" ? "Use existing account" : "Create account";
}

function renderAvatar(element, displayName, imageUrl) {
  element.replaceChildren();
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    element.append(image);
  } else if (displayName) {
    element.textContent = getInitials(displayName);
  } else {
    element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.3" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 20c.5-3.5 2.7-5.3 6.5-5.3s6 1.8 6.5 5.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }
}

async function loadCloudData() {
  if (!supabase || !supabaseUser) return;
  const [{ data: rows, error: transactionsError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", supabaseUser.id).order("date", { ascending: false }),
    supabase.from("profiles").select("currency,display_name,avatar_path").eq("id", supabaseUser.id).maybeSingle()
  ]);
  if (transactionsError || profileError) {
    const error = transactionsError || profileError;
    showAppStatus(`Could not load your account data: ${error.message}`);
    setAuthUi();
    return;
  }
  transactions = (rows || []).map((item) => ({
    id: item.id,
    description: item.description,
    category: item.category,
    type: item.type,
    amount: Number(item.amount),
    date: item.date,
    currency: item.currency || "USD"
  }));
  selectedCurrency = profile?.currency || "USD";
  profileDisplayName = profile?.display_name || "";
  profileAvatarPath = profile?.avatar_path || "";
  profileAvatarUrl = "";
  if (profileAvatarPath) {
    const { data: avatar, error: avatarError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(profileAvatarPath, 60 * 60);
    if (avatarError) {
      showAppStatus(`Could not load your profile photo: ${avatarError.message}`);
    } else {
      profileAvatarUrl = avatar.signedUrl;
    }
  }
  localStorage.setItem(CURRENCY_KEY, selectedCurrency);
  $("#currency-select").value = selectedCurrency;
  currency = new Intl.NumberFormat("en-US", { style: "currency", currency: selectedCurrency });
  $("#amount-currency-symbol").textContent = currencySymbols[selectedCurrency] || selectedCurrency;
  showAppStatus("");
  renderSummary();
  renderTransactions();
  setAuthUi();
}

async function handleAuthSession(session) {
  supabaseUser = session?.user || null;
  if (supabaseUser) {
    await loadCloudData();
    closeAuth();
  } else {
    profileDisplayName = "";
    profileAvatarPath = "";
    profileAvatarUrl = "";
    transactions = savedTransactions.transactions;
    setAuthUi();
    renderSummary();
    renderTransactions();
  }
}

$("#open-auth").addEventListener("click", openAuth);
$("#open-auth-top").addEventListener("click", openAuth);
$("#mobile-profile").addEventListener("click", openAuth);
$("#close-auth").addEventListener("click", closeAuth);
$("#auth-backdrop").addEventListener("click", (event) => {
  if (event.target === $("#auth-backdrop")) closeAuth();
});
$("#auth-mode-toggle").addEventListener("click", () => {
  authMode = authMode === "signup" ? "signin" : "signup";
  setAuthUi();
  $("#auth-message").hidden = true;
});
$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    $("#auth-message").textContent = "Supabase is not configured yet. Add the Vercel environment variables first.";
    $("#auth-message").hidden = false;
    return;
  }
  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const submit = $("#auth-submit");
  const message = $("#auth-message");
  submit.disabled = true;
  message.hidden = true;
  const result = authMode === "signup"
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password });
  submit.disabled = false;
  if (result.error) {
    message.textContent = result.error.message;
    message.hidden = false;
    return;
  }
  if (authMode === "signup" && !result.data.session) {
    message.textContent = "Account created. Check your email to confirm it, then sign in.";
    message.hidden = false;
    authMode = "signin";
    setAuthUi();
    return;
  }
  await handleAuthSession(result.data.session);
});

$("#profile-photo").addEventListener("change", (event) => {
  const file = event.currentTarget.files[0];
  const message = $("#profile-message");
  message.hidden = true;
  message.classList.remove("success");
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    message.textContent = "Choose a PNG, JPG, or WebP image.";
    message.hidden = false;
    event.currentTarget.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    message.textContent = "Choose an image smaller than 2 MB.";
    message.hidden = false;
    event.currentTarget.value = "";
    return;
  }
  if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
  pendingAvatarUrl = URL.createObjectURL(file);
  renderAvatar($("#profile-photo-preview"), $("#profile-display-name").value, pendingAvatarUrl);
});

$("#profile-display-name").addEventListener("input", () => {
  if (!pendingAvatarUrl && !profileAvatarUrl) {
    renderAvatar($("#profile-photo-preview"), $("#profile-display-name").value, "");
  }
});

$("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $("#profile-message");
  const saveButton = $("#profile-save");
  const displayName = form.elements.displayName.value.trim();
  const photo = form.elements.photo.files[0];
  message.hidden = true;
  message.classList.remove("success");
  if (!supabase || !supabaseUser) {
    message.textContent = "Sign in before saving profile settings.";
    message.hidden = false;
    return;
  }
  if (!displayName) {
    message.textContent = "Enter a display name.";
    message.hidden = false;
    form.elements.displayName.focus();
    return;
  }

  saveButton.disabled = true;
  try {
    let avatarPath = profileAvatarPath;
    if (photo) {
      avatarPath = `${supabaseUser.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, photo, { upsert: true, contentType: photo.type });
      if (uploadError) throw uploadError;
    }

    let avatarUrl = "";
    if (avatarPath) {
      const { data: avatar, error: avatarError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPath, 60 * 60);
      if (avatarError) throw avatarError;
      avatarUrl = avatar.signedUrl;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: supabaseUser.id,
      currency: selectedCurrency,
      display_name: displayName,
      avatar_path: avatarPath || null,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;

    profileDisplayName = displayName;
    profileAvatarPath = avatarPath;
    profileAvatarUrl = avatarUrl;
    if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
    pendingAvatarUrl = null;
    form.elements.photo.value = "";
    setAuthUi();
    message.textContent = "Profile saved.";
    message.classList.add("success");
    message.hidden = false;
  } catch (error) {
    message.textContent = `Could not save your profile: ${error.message}`;
    message.hidden = false;
  } finally {
    saveButton.disabled = false;
  }
});

$("#auth-signout").addEventListener("click", async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) showAppStatus(`Could not sign out: ${error.message}`);
});

if (supabase) {
  supabase.auth.getSession().then(({ data }) => handleAuthSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthSession(session);
  });
} else {
  setAuthUi();
}
