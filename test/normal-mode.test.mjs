import test from "node:test";
import assert from "node:assert/strict";

import { CTRL_C, ESC, createEditor, press } from "./harness.mjs";

test("u in normal mode undoes the last edit", () => {
  const editor = createEditor("abc");

  press(editor, ESC, "x");
  assert.equal(editor.getText(), "bc");

  press(editor, "u");

  assert.equal(editor.getText(), "abc");
  assert.equal(editor.mode, "normal");
});

test("Pass through ctrl+c in normal mode so app can quit", () => {
  let sawCtrlC = false;
  const keybindings = {
    matches: (data, action) => {
      if (data === CTRL_C && action === "app.interrupt") {
        sawCtrlC = true;
      }
      return false;
    },
  };

  const editor = createEditor("abc", keybindings);

  press(editor, ESC, CTRL_C);

  assert.equal(editor.mode, "normal");
  assert.equal(sawCtrlC, true);
});
