import assert from "node:assert/strict";
import test from "node:test";
import { calculate } from "./calculator.js";

test("calculates the four basic operations", () => {
  assert.equal(calculate(12, "+", 8), 20);
  assert.equal(calculate(12, "-", 8), 4);
  assert.equal(calculate(12, "*", 8), 96);
  assert.equal(calculate(12, "/", 8), 1.5);
});

test("rounds floating point arithmetic for display", () => {
  assert.equal(calculate(0.1, "+", 0.2), 0.3);
});

test("rejects division by zero", () => {
  assert.throws(() => calculate(12, "/", 0), /Cannot divide by zero/);
});
