const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Collection } = require("../dist/managers/Collection");

test("Collection.filter/map/find behave like array equivalents", () => {
  const c = new Collection([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
  assert.deepEqual(c.filter((v) => v > 1).toArray(), [2, 3]);
  assert.deepEqual(
    c.map((v) => v * 2),
    [2, 4, 6],
  );
  assert.equal(
    c.find((v) => v === 2),
    2,
  );
  assert.equal(c.first(), 1);
});

test("Collection evicts the oldest entry once maxSize is exceeded", () => {
  const c = new Collection(null, 2);
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3);
  assert.equal(c.size, 2);
  assert.equal(c.has("a"), false);
  assert.equal(c.has("b"), true);
  assert.equal(c.has("c"), true);
});

test("Collection does not evict when updating an existing key", () => {
  const c = new Collection(null, 2);
  c.set("a", 1);
  c.set("b", 2);
  c.set("a", 10);
  assert.equal(c.size, 2);
  assert.equal(c.get("a"), 10);
});

test("Collection.sweep removes entries older than maxAgeMs", () => {
  const c = new Collection();
  c.set("old", 1);
  const sweptImmediately = c.sweep({ maxAgeMs: 1000 });
  assert.equal(sweptImmediately, 0, "fresh entries should not be swept yet");

  const swept = c.sweep({ maxAgeMs: -1 });
  assert.equal(swept, 1);
  assert.equal(c.has("old"), false);
});

test("Collection.sweep respects a filter", () => {
  const c = new Collection();
  c.set("keep", "keep-me");
  c.set("drop", "drop-me");

  const swept = c.sweep({ maxAgeMs: -1, filter: (value) => value === "drop-me" });
  assert.equal(swept, 1);
  assert.equal(c.has("keep"), true);
  assert.equal(c.has("drop"), false);
});

test("constructing with initial entries still populates timestamps (no crash on sweep)", () => {
  const c = new Collection([
    ["a", 1],
    ["b", 2],
  ]);
  assert.equal(c.size, 2);
  assert.equal(c.sweep({ maxAgeMs: -1 }), 2);
});
