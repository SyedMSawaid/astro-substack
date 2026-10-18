import { test } from "node:test";
import assert from "node:assert";
import { baseUrl, originalImageUrl } from "../dist/sync.js";

test("baseUrl", () => {
  assert.equal(baseUrl("on"), "https://on.substack.com");
  assert.equal(baseUrl("on.substack.com"), "https://on.substack.com");
  assert.equal(baseUrl("https://x.com/"), "https://x.com");
});
test("originalImageUrl", () => {
  const u = "https://substackcdn.com/image/fetch/$s_!4LM4!,f_auto/https%3A%2F%2Fbucket.s3.amazonaws.com%2Fpublic%2Fimages%2Fabc_1x1.png";
  assert.equal(originalImageUrl(u), "https://bucket.s3.amazonaws.com/public/images/abc_1x1.png");
});
