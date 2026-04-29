import test from "node:test";
import assert from "node:assert/strict";

import { ESC, createEditor, press } from "./harness.mjs";

test("Defaults into insert mode", () => {
  const editor = createEditor("abc");

  assert.equal(editor.getText(), "abc");
  assert.equal(editor.mode, "insert");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("Exit insert mode", () => {
  const editor = createEditor("abc");

  press(editor, ESC);

  assert.equal(editor.getText(), "abc");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("Enter insert mode (insert before)", () => {
  const editor = createEditor("abc");

  press(editor, ESC, "i", "l");

  assert.equal(editor.getText(), "labc");
  assert.equal(editor.mode, "insert");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
});

test("Enter insert mode (insert after)", () => {
  const editor = createEditor("abc");

  press(editor, ESC, "a", "l");

  assert.equal(editor.getText(), "albc");
  assert.equal(editor.mode, "insert");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 2 });
});

test("change to end of line with C enters insert mode", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "C", "X");

  assert.equal(editor.getText(), "lorem X");
  assert.equal(editor.mode, "insert");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 7 });
});

test("substitute line with S enters insert mode", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "S", "X");

  assert.equal(editor.getText(), "one\nX\nthree");
  assert.equal(editor.mode, "insert");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 1 });
});
