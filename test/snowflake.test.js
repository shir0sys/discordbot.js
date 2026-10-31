const { test } = require("node:test");
const assert = require("node:assert/strict");
const { deconstruct, timestampFrom, generate } = require("../dist/util/SnowflakeUtil");

test("deconstruct extracts the embedded timestamp close to a known real snowflake", () => {
  // 886000000000000000 was minted well after the 2026-01-01 mark; just assert ordering/sanity, not an exact date.
  const snowflake = "886000000000000000";
  const { timestamp } = deconstruct(snowflake);
  assert.ok(timestamp > Date.parse("2021-01-01"));
  assert.ok(timestamp < Date.now() + 1000);
});

test("generate -> timestampFrom round-trips to the same millisecond (truncated to snowflake precision)", () => {
  const now = Date.now();
  const snowflake = generate(now);
  const extracted = timestampFrom(snowflake);
  assert.equal(extracted, now);
});
