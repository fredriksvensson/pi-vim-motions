import test from "node:test";
import assert from "node:assert/strict";

import { ESC, createEditor, press } from "./harness.mjs";

test("yank current line with yy and paste below with p", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "k", "y", "y", "p");

  assert.equal(editor.getText(), "one\none\ntwo\nthree");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("yank current line with yy and paste above with P", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "y", "y", "P");

  assert.equal(editor.getText(), "one\ntwo\ntwo\nthree");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("yank with motion yw and paste with p", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "y", "w", "p");

  assert.equal(editor.getText(), "llorem orem ipsum");
  assert.equal(editor.mode, "normal");
});

test("yank with motion y$ and paste with p", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "y", "$", "p");

  assert.equal(editor.getText(), "llorem ipsumorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
});

test("yank with motion y0 and paste with P", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "y", "0", "P");

  assert.equal(editor.getText(), "lorem lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
});

test("yank with motion yb and paste with p", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "y", "b", "p");

  assert.equal(editor.getText(), "lorem ilorem psum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 12 });
});

test("yank with motion ye and paste with p", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "y", "e", "p");

  assert.equal(editor.getText(), "lloremorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 5 });
});

test("linewise register remains linewise when pasted with P", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "y", "y", "k", "P");

  assert.equal(editor.getText(), "two\none\ntwo\nthree");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("escape cancels pending yank sequence", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "y", ESC, "p");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("unsupported yank completion cancels operator-pending mode", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "y", "q", "p");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("yank with count y3w and paste with p", () => {
  const editor = createEditor("one two three four");

  press(editor, ESC, "y", "3", "w", "p");

  assert.equal(editor.getText(), "oone two three ne two three four");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 14 });
});

test("yank to end of line with Y", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "Y", "p");

  assert.equal(editor.getText(), "llorem ipsumorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
});
