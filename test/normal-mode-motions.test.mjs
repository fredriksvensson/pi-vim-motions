import test from "node:test";
import assert from "node:assert/strict";

import { ESC, createEditor, press } from "./harness.mjs";

test("motion navigation right", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "l");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
});

test("motion navigation left", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "l", "l", "h");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
});

test("motion navigation word (forward)", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "w");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 6 });
});

test("motion navigation word end", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "e");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 4 });
});

test("motion navigation word (backward)", () => {
  const editor = createEditor("lorem ipsum dolor");

  press(editor, ESC, "w", "w", "b");

  assert.equal(editor.getText(), "lorem ipsum dolor");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 6 });
});

test("motion navigation down and up", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "j", "k");

  assert.equal(editor.getText(), "one\ntwo\nthree");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("normal mode ignores unmapped printable keys", () => {
  const editor = createEditor("abc");

  press(editor, ESC, "q");

  assert.equal(editor.getText(), "abc");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("motion navigation WORD variants", () => {
  const editor = createEditor("lorem ipsum dolor");

  press(editor, ESC, "W", "B");

  assert.equal(editor.getText(), "lorem ipsum dolor");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("motion navigation to line boundaries", () => {
  const editor = createEditor("lorem ipsum");

  press(editor, ESC, "$", "0", "^");

  assert.equal(editor.getText(), "lorem ipsum");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("find motions forward and backward", () => {
  const editor = createEditor("lorem ipsum dolor");

  press(editor, ESC, "f", "m", "F", "o");

  assert.equal(editor.getText(), "lorem ipsum dolor");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
});

test("motion count 3w", () => {
  const editor = createEditor("one two three four five");

  press(editor, ESC, "3", "w");

  assert.equal(editor.getText(), "one two three four five");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 14 });
});

test("g waits for completion as a valid prefix", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "g");

  assert.equal(editor.getText(), "one\ntwo\nthree");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
});

test("invalid completion after g cancels sequence and consumes input", () => {
  const editor = createEditor("abc");

  press(editor, ESC, "g", "x");

  assert.equal(editor.getText(), "abc");
  assert.equal(editor.mode, "normal");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("motion gg moves to first line", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "g", "g");

  assert.equal(editor.getText(), "one\ntwo\nthree");
  assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
});

test("motion G moves to last line", () => {
  const editor = createEditor("one\ntwo\nthree");

  press(editor, ESC, "k", "k", "G");

  assert.equal(editor.getText(), "one\ntwo\nthree");
  assert.deepEqual(editor.getCursor(), { line: 2, col: 0 });
});
