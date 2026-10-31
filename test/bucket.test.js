const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Bucket } = require("../dist/rest/Bucket");

test("Bucket serializes concurrent enqueues to execute one at a time, in order", async () => {
  const bucket = new Bucket("test");
  const order = [];

  const run = (id, ms) =>
    bucket.enqueue(async () => {
      order.push(`start:${id}`);
      await new Promise((resolve) => setTimeout(resolve, ms));
      order.push(`end:${id}`);
    });

  await Promise.all([run(1, 20), run(2, 5), run(3, 0)]);

  assert.deepEqual(order, ["start:1", "end:1", "start:2", "end:2", "start:3", "end:3"]);
});

test("Bucket.lockFor delays subsequent processing until the lock expires", async () => {
  const bucket = new Bucket("test");
  bucket.lockFor(50);

  const start = Date.now();
  await bucket.enqueue(async () => {});
  assert.ok(Date.now() - start >= 45);
});
