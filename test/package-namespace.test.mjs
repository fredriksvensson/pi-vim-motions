import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = ["package.json", "src/index.ts", "src/commands.ts", "src/editor-ops.ts"];

test("uses current Earendil Pi package namespace", async () => {
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /@mariozechner\//, file);
  }
});
