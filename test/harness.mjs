import { VimMotionsEditor } from "../dist/index.js";

export const ESC = "\x1b";
export const CTRL_C = "\x03";

export function createEditor(text = "", keybindings = { matches: () => false }) {
  const tui = {
    terminal: { rows: 40, columns: 120 },
    requestRender: () => {},
  };
  const theme = {};

  const editor = new VimMotionsEditor(tui, theme, keybindings);
  editor.setText(text);
  return editor;
}

export function press(editor, ...keys) {
  for (const key of keys) editor.handleInput(key);
}
