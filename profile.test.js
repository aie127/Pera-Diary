import assert from "node:assert/strict";
import test from "node:test";
import { getInitials } from "./profile.js";

test("builds initials from a user's display name", () => {
  assert.equal(getInitials("Cassandra Gabriel"), "CG");
  assert.equal(getInitials("  Cassandra  "), "C");
});

test("returns no initials for an empty name", () => {
  assert.equal(getInitials("  "), "");
});
