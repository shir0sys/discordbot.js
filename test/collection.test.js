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
  assert.deepEqual(c.map((v) => v * 2), [2, 4, 6]);
  assert.equal(c.find((v) => v === 2), 2);
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
