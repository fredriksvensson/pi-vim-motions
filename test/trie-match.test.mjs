import test from "node:test";
import assert from "node:assert/strict";

import { buildTrie, matchTrie } from "../dist/index.js";
import { ANY_KEY } from "../dist/commands.js";

const run = () => {};

test("matchTrie picks highest order command for mode across exact and wildcard matches", () => {
  const exactNormal = { keys: [["x"]], modes: ["normal"], run, order: 5 };
  const wildcardNormal = { keys: [[ANY_KEY]], modes: ["normal"], run, order: 10 };
  const wildcardInsert = { keys: [[ANY_KEY]], modes: ["insert"], run, order: 99 };

  const trie = buildTrie([exactNormal, wildcardNormal, wildcardInsert]);

  assert.equal(matchTrie(["x"], trie, "normal"), wildcardNormal);
});
