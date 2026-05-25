import { CustomEditor } from "@earendil-works/pi-coding-agent";

type Cursor = { line: number; col: number };

interface EditorOps {
  moveCursor(rowDelta: number, colDelta: number): void;
  moveWordForwards(): void;
  moveWordBackwards(): void;
  handleForwardDelete(): void;
  moveToLineStart(): void;
  moveToLineEnd(): void;
  jumpToChar(char: string, direction: "forward" | "backward"): void;
  getCursor(): Cursor;
}

export function getEditorOps(editor: CustomEditor): EditorOps {
  return editor as unknown as EditorOps;
}

export function getCursor(editor: CustomEditor): Cursor {
  return getEditorOps(editor).getCursor();
}
