import assert from "node:assert/strict";
import test from "node:test";
import "./advisor.js";

const { advisorReply } = globalThis;

const today = new Date(2026, 10, 20, 12);

test("asks for transaction history before offering a spending summary", () => {
  assert.match(advisorReply("Summarize my spending", [], today), /transactions for November yet/i);
});

test("summarizes only current-month transactions up to today", () => {
  const transactions = [
    { type: "income", category: "Salary", amount: 4000, date: "2026-11-01" },
    { type: "expense", category: "Food & drink", amount: 200, date: "2026-11-03" },
    { type: "expense", category: "Shopping", amount: 50, date: "2026-11-05" },
    { type: "expense", category: "Bills", amount: 999, date: "2026-11-21" },
    { type: "expense", category: "Food & drink", amount: 1000, date: "2026-10-29" }
  ];

  assert.match(advisorReply("Where am I spending the most?", transactions, today), /Food & drink.*\$200\.00/);
});

test("avoids investment and tax recommendations", () => {
  assert.match(advisorReply("Which stocks should I buy?", [], today), /recommend investments/i);
});
