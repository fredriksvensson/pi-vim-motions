import test from "node:test";
import assert from "node:assert/strict";

import { ESC, createEditor, press } from "./harness.mjs";

test("delete current character with x", () => {
  const editor = createEditor("lorem");

  press(editor, ESC, "x");

  assert.equal(editor.getText(), "orem");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete current line with dd", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "d", "d");

  assert.equal(editor.getText(), "one\nthree");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("delete with motion dw", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", "w");

  assert.equal(editor.getText(), "ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with motion db", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "d", "b");

  assert.equal(editor.getText(), "ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with motion de", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", "e");

  assert.equal(editor.getText(), " ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with motion dh and dl", () => {
  const editor = createEditor("lorem");

  press(editor, ESC, "l", "d", "h");
  assert.equal(editor.getText(), "orem");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });

  press(editor, "d", "l");
  assert.equal(editor.getText(), "rem");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with motion d0 and d$", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "d", "0");
  assert.equal(editor.getText(), "ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });

  press(editor, "d", "$");
  assert.equal(editor.getText(), "");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with find df<char>", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", "f", "m");

  assert.equal(editor.getText(), " ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete with find dF<char>", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "$", "d", "F", "r");

  assert.equal(editor.getText(), "lo");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 2 });
});

test("escape cancels pending delete sequence", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", ESC);

  assert.equal(editor.getText(), "lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("unsupported delete completion cancels operator-pending mode", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", "q");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete line with dd and paste with p", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "d", "d", "p");

  assert.equal(editor.getText(), "one\nthree\ntwo");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 2, col: 0 });
});

test("delete char with x and paste with p", () => {
  const editor = createEditor("lorem");

  press(editor, ESC, "x", "p");

  assert.equal(editor.getText(), "olrem");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
});

test("delete with dw and paste with p", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "d", "w", "p");

  assert.equal(editor.getText(), "ilorem psum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 6 });
});

test("delete with d$ and paste with P", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "d", "$", "P");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 10 });
});

test("delete count 2x", () => {
  const editor = createEditor("lorem");

  press(editor, ESC, "2", "x");

  assert.equal(editor.getText(), "rem");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete line count 2dd", () => {
  const editor = createEditor("one\ntwo\nthree\nfour");

  press(editor, ESC, "k", "k", "2", "d", "d");

  assert.equal(editor.getText(), "one\nfour");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("delete with operator motion count d2w", () => {
  const editor = createEditor("one two three four");

  press(editor, ESC, "d", "2", "w");

  assert.equal(editor.getText(), "three four");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("delete to end of line with D", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w", "D");

  assert.equal(editor.getText(), "lorem ");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 6 });
});
