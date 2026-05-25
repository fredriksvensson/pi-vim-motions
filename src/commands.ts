import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { getCursor, getEditorOps } from "./editor-ops.js";

export type Mode = "normal" | "insert" | "visual" | "operatorPending";
export type Key = string;
type KeySequence = readonly Key[];

type CommandEditor = CustomEditor & {
  mode: Mode;
  insertRaw(data: string): void;
};

type PendingOperator = "delete" | "yank";

type CountMode = "normal" | "operatorPending";

type YankRegister =
  | { kind: "line"; text: string }
  | { kind: "char"; text: string };

interface CommandContext {
  readonly editor: CommandEditor;
  readonly key: Key;
  readonly data: string;
}

export interface Command {
  readonly id: string;
  readonly modes: readonly Mode[];
  readonly keys: readonly KeySequence[];
  readonly order?: number;
  readonly run: (ctx: CommandContext) => void;
}

interface LineRange {
  fromCol: number;
  toColExclusive: number;
}

interface OperatorMotion {
  id: string;
  keys: readonly KeySequence[];
  resolveRange: (ctx: CommandContext, count: number) => LineRange;
}

function moveBySteps(
  editor: CommandEditor,
  rowDelta: number,
  colDelta: number,
): void {
  const ops = getEditorOps(editor);
  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);

  for (let i = 0; i < Math.abs(rowDelta); i++) ops.moveCursor(rowStep, 0);
  for (let i = 0; i < Math.abs(colDelta); i++) ops.moveCursor(0, colStep);
}

function setCursor(editor: CommandEditor, line: number, col: number): void {
  const ops = getEditorOps(editor);
  const current = getCursor(editor);
  ops.moveToLineStart();
  moveBySteps(editor, -current.line, 0);
  moveBySteps(editor, line, 0);
  moveBySteps(editor, 0, col);
}

const pendingOperatorByEditor = new WeakMap<CommandEditor, PendingOperator>();
const pendingOperatorCountByEditor = new WeakMap<CommandEditor, number>();
const countByEditor = new WeakMap<CommandEditor, number>();
const countModeByEditor = new WeakMap<CommandEditor, CountMode>();
const yankRegisterByEditor = new WeakMap<CommandEditor, YankRegister>();

function pushCountDigit(
  editor: CommandEditor,
  digit: number,
  mode: CountMode,
): void {
  const currentMode = countModeByEditor.get(editor);
  const current = currentMode === mode ? (countByEditor.get(editor) ?? 0) : 0;
  countByEditor.set(editor, current * 10 + digit);
  countModeByEditor.set(editor, mode);
}

function consumeCount(editor: CommandEditor, mode: CountMode): number {
  if (countModeByEditor.get(editor) !== mode) return 1;
  const count = countByEditor.get(editor) ?? 0;
  countByEditor.delete(editor);
  countModeByEditor.delete(editor);
  return Math.max(1, count);
}

function clearCount(editor: CommandEditor): void {
  countByEditor.delete(editor);
  countModeByEditor.delete(editor);
}

function deleteCurrentLines(editor: CommandEditor, count: number): void {
  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");
  if (lines.length === 0) return;

  const start = Math.max(0, Math.min(cursor.line, lines.length - 1));
  const endExclusive = Math.min(lines.length, start + Math.max(1, count));
  const deleted = lines.slice(start, endExclusive);
  yankRegisterByEditor.set(editor, { kind: "line", text: deleted.join("\n") });

  lines.splice(start, endExclusive - start);
  editor.setText(lines.join("\n"));

  const nextLine = Math.max(0, Math.min(start, lines.length - 1));
  setCursor(editor, nextLine, 0);
}

function yankCurrentLines(editor: CommandEditor, count: number): void {
  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");
  const start = Math.max(0, Math.min(cursor.line, lines.length - 1));
  const endExclusive = Math.min(lines.length, start + Math.max(1, count));
  const yanked = lines.slice(start, endExclusive).join("\n");
  yankRegisterByEditor.set(editor, { kind: "line", text: yanked });
}

function yankRangeInLine(
  editor: CommandEditor,
  fromCol: number,
  toCol: number,
): void {
  const cursor = getCursor(editor);
  const line = editor.getText().split("\n")[cursor.line] ?? "";
  const start = Math.max(0, Math.min(fromCol, toCol));
  const end = Math.max(start, Math.max(fromCol, toCol));
  const text = line.slice(start, end);
  yankRegisterByEditor.set(editor, { kind: "char", text });
}

function pasteYank(editor: CommandEditor, direction: "after" | "before"): void {
  const yanked = yankRegisterByEditor.get(editor);
  if (!yanked) return;

  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");

  if (yanked.kind === "line") {
    const targetLine = direction === "after" ? cursor.line + 1 : cursor.line;
    lines.splice(targetLine, 0, yanked.text);
    editor.setText(lines.join("\n"));
    setCursor(editor, targetLine, 0);
    return;
  }

  const line = lines[cursor.line] ?? "";
  const insertAt = direction === "after" ? cursor.col + 1 : cursor.col;
  lines[cursor.line] =
    line.slice(0, insertAt) + yanked.text + line.slice(insertAt);
  editor.setText(lines.join("\n"));
  const lastInsertedCol = Math.max(insertAt, insertAt + yanked.text.length - 1);
  setCursor(editor, cursor.line, lastInsertedCol);
}

function deleteCharForward(editor: CommandEditor, count: number): void {
  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");
  const line = lines[cursor.line] ?? "";
  const end = Math.min(line.length, cursor.col + Math.max(1, count));
  const deleted = line.slice(cursor.col, end);
  if (deleted.length === 0) return;

  yankRegisterByEditor.set(editor, { kind: "char", text: deleted });
  lines[cursor.line] = line.slice(0, cursor.col) + line.slice(end);
  editor.setText(lines.join("\n"));
  setCursor(editor, cursor.line, cursor.col);
}

function deleteRangeInLine(
  editor: CommandEditor,
  fromCol: number,
  toCol: number,
): void {
  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");
  const line = lines[cursor.line] ?? "";
  const start = Math.max(0, Math.min(fromCol, toCol));
  const end = Math.max(start, Math.max(fromCol, toCol));
  const deleted = line.slice(start, end);
  yankRegisterByEditor.set(editor, { kind: "char", text: deleted });
  lines[cursor.line] = line.slice(0, start) + line.slice(end);
  editor.setText(lines.join("\n"));
  setCursor(editor, cursor.line, start);
}

function substituteCurrentLine(editor: CommandEditor): void {
  const cursor = getCursor(editor);
  const lines = editor.getText().split("\n");
  const line = lines[cursor.line] ?? "";
  yankRegisterByEditor.set(editor, { kind: "char", text: line });
  lines[cursor.line] = "";
  editor.setText(lines.join("\n"));
  setCursor(editor, cursor.line, 0);
}

function moveToWordEndForward(editor: CommandEditor): void {
  const cursor = getCursor(editor);
  const line = editor.getText().split("\n")[cursor.line] ?? "";

  if (cursor.col >= line.length) return;

  const textFromCursor = line.slice(cursor.col);
  const firstNonWhitespace = textFromCursor.search(/\S/);
  if (firstNonWhitespace === -1) return;

  const wordStart = cursor.col + firstNonWhitespace;
  const textFromWordStart = line.slice(wordStart);
  const firstWhitespaceAfterWord = textFromWordStart.search(/\s/);
  const target =
    firstWhitespaceAfterWord === -1
      ? line.length - 1
      : wordStart + firstWhitespaceAfterWord - 1;

  moveBySteps(editor, 0, target - cursor.col);
}

function runDeleteOperatorMotion(
  ctx: CommandContext,
  motion: OperatorMotion,
): void {
  const operatorCount = pendingOperatorCountByEditor.get(ctx.editor) ?? 1;
  const motionCount = consumeCount(ctx.editor, "operatorPending");
  const { fromCol, toColExclusive } = motion.resolveRange(
    ctx,
    operatorCount * motionCount,
  );
  deleteRangeInLine(ctx.editor, fromCol, toColExclusive);
  pendingOperatorByEditor.delete(ctx.editor);
  pendingOperatorCountByEditor.delete(ctx.editor);
  ctx.editor.mode = "normal";
}

function runYankOperatorMotion(
  ctx: CommandContext,
  motion: OperatorMotion,
): void {
  const operatorCount = pendingOperatorCountByEditor.get(ctx.editor) ?? 1;
  const motionCount = consumeCount(ctx.editor, "operatorPending");
  const cursor = getCursor(ctx.editor);
  const { fromCol, toColExclusive } = motion.resolveRange(
    ctx,
    operatorCount * motionCount,
  );
  yankRangeInLine(ctx.editor, fromCol, toColExclusive);
  setCursor(ctx.editor, cursor.line, cursor.col);
  pendingOperatorByEditor.delete(ctx.editor);
  pendingOperatorCountByEditor.delete(ctx.editor);
  ctx.editor.mode = "normal";
}

function createOperatorMotionCommands(
  motions: readonly OperatorMotion[],
): readonly Command[] {
  return motions.map((motion) => ({
    id: `operator.motion.${motion.id}`,
    keys: motion.keys,
    modes: ["operatorPending"],
    run: (ctx) => {
      const operator = pendingOperatorByEditor.get(ctx.editor);
      if (operator === "delete") {
        runDeleteOperatorMotion(ctx, motion);
        return;
      }

      if (operator === "yank") {
        runYankOperatorMotion(ctx, motion);
      }
    },
  }));
}

export const ANY_KEY = "*";

const deleteMotions = [
  {
    id: "left",
    keys: [["h"]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      return {
        fromCol: Math.max(0, cursor.col - Math.max(1, count)),
        toColExclusive: cursor.col,
      };
    },
  },
  {
    id: "right",
    keys: [["l"]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      return {
        fromCol: cursor.col,
        toColExclusive: cursor.col + Math.max(1, count),
      };
    },
  },
  {
    id: "wordForward",
    keys: [["w"], ["W"]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      const ops = getEditorOps(ctx.editor);
      for (let i = 0; i < count; i++) {
        ops.moveWordForwards();
        ops.moveCursor(0, 1);
      }
      const next = getCursor(ctx.editor);
      return { fromCol: cursor.col, toColExclusive: next.col };
    },
  },
  {
    id: "wordEnd",
    keys: [["e"], ["E"]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      for (let i = 0; i < count; i++) moveToWordEndForward(ctx.editor);
      const next = getCursor(ctx.editor);
      return { fromCol: cursor.col, toColExclusive: next.col + 1 };
    },
  },
  {
    id: "wordBackward",
    keys: [["b"], ["B"]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      const ops = getEditorOps(ctx.editor);
      for (let i = 0; i < count; i++) ops.moveWordBackwards();
      const next = getCursor(ctx.editor);
      return { fromCol: next.col, toColExclusive: cursor.col };
    },
  },
  {
    id: "lineStart",
    keys: [["0"], ["^"]],
    resolveRange: (ctx, _count) => {
      const cursor = getCursor(ctx.editor);
      return { fromCol: 0, toColExclusive: cursor.col };
    },
  },
  {
    id: "lineEnd",
    keys: [["$"]],
    resolveRange: (ctx, _count) => {
      const cursor = getCursor(ctx.editor);
      const line = ctx.editor.getText().split("\n")[cursor.line] ?? "";
      return { fromCol: cursor.col, toColExclusive: line.length };
    },
  },
  {
    id: "findForward",
    keys: [["f", ANY_KEY]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      const ops = getEditorOps(ctx.editor);
      for (let i = 0; i < count; i++) ops.jumpToChar(ctx.key, "forward");
      const next = getCursor(ctx.editor);
      return { fromCol: cursor.col, toColExclusive: next.col + 1 };
    },
  },
  {
    id: "findBackward",
    keys: [["F", ANY_KEY]],
    resolveRange: (ctx, count) => {
      const cursor = getCursor(ctx.editor);
      const ops = getEditorOps(ctx.editor);
      for (let i = 0; i < count; i++) ops.jumpToChar(ctx.key, "backward");
      const next = getCursor(ctx.editor);
      return { fromCol: next.col, toColExclusive: cursor.col + 1 };
    },
  },
] as const satisfies readonly OperatorMotion[];

function runCountedNormalMotion(ctx: CommandContext, action: () => void): void {
  const count = consumeCount(ctx.editor, "normal");
  for (let i = 0; i < count; i++) action();
}

function createCountDigitCommands(mode: CountMode): readonly Command[] {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => ({
    id: `count.${mode}.${digit}`,
    keys: [[digit]],
    order: 200,
    run: (ctx: CommandContext) => {
      pushCountDigit(ctx.editor, Number(digit), mode);
    },
    modes: [mode],
  }));
}

const normalCountDigitCommands = createCountDigitCommands("normal");
const operatorPendingCountDigitCommands =
  createCountDigitCommands("operatorPending");

function clearPendingOperator(editor: CommandEditor): void {
  pendingOperatorByEditor.delete(editor);
  pendingOperatorCountByEditor.delete(editor);
  clearCount(editor);
}

function runPendingLineOperator(
  ctx: CommandContext,
  expected: PendingOperator,
  action: (count: number) => void,
): void {
  if (pendingOperatorByEditor.get(ctx.editor) !== expected) return;
  action(pendingOperatorCountByEditor.get(ctx.editor) ?? 1);
  clearPendingOperator(ctx.editor);
  ctx.editor.mode = "normal";
}

function deleteToLineEnd(editor: CommandEditor): void {
  const cursor = getCursor(editor);
  const line = editor.getText().split("\n")[cursor.line] ?? "";
  deleteRangeInLine(editor, cursor.col, line.length);
}

const modeActionCommands = [
  ...normalCountDigitCommands,
  ...operatorPendingCountDigitCommands,
  {
    id: "delete.char",
    keys: [["x"]],
    run: (ctx: CommandContext) => {
      deleteCharForward(ctx.editor, consumeCount(ctx.editor, "normal"));
    },
    modes: ["normal"],
  },
  {
    id: "delete.pending.enter",
    keys: [["d"]],
    run: (ctx: CommandContext) => {
      pendingOperatorByEditor.set(ctx.editor, "delete");
      pendingOperatorCountByEditor.set(
        ctx.editor,
        consumeCount(ctx.editor, "normal"),
      );
      ctx.editor.mode = "operatorPending";
    },
    modes: ["normal"],
  },
  {
    id: "yank.pending.enter",
    keys: [["y"]],
    run: (ctx: CommandContext) => {
      pendingOperatorByEditor.set(ctx.editor, "yank");
      pendingOperatorCountByEditor.set(
        ctx.editor,
        consumeCount(ctx.editor, "normal"),
      );
      ctx.editor.mode = "operatorPending";
    },
    modes: ["normal"],
  },
  {
    id: "operator.pending.cancel",
    keys: [["escape"]],
    run: (ctx: CommandContext) => {
      clearPendingOperator(ctx.editor);
      ctx.editor.mode = "normal";
    },
    modes: ["operatorPending"],
  },
  {
    id: "delete.line",
    keys: [["d"]],
    run: (ctx: CommandContext) => {
      runPendingLineOperator(ctx, "delete", (count) => {
        deleteCurrentLines(ctx.editor, count);
      });
    },
    modes: ["operatorPending"],
  },
  {
    id: "yank.line",
    keys: [["y"]],
    run: (ctx: CommandContext) => {
      runPendingLineOperator(ctx, "yank", (count) => {
        yankCurrentLines(ctx.editor, count);
      });
    },
    modes: ["operatorPending"],
  },
  ...createOperatorMotionCommands(deleteMotions),
  {
    id: "yank.toLineEnd",
    keys: [["Y"]],
    run: (ctx: CommandContext) => {
      const cursor = getCursor(ctx.editor);
      const line = ctx.editor.getText().split("\n")[cursor.line] ?? "";
      yankRangeInLine(ctx.editor, cursor.col, line.length);
      setCursor(ctx.editor, cursor.line, cursor.col);
      ctx.editor.mode = "normal";
    },
    modes: ["normal"],
  },
  {
    id: "paste.after",
    keys: [["p"]],
    run: (ctx: CommandContext) => {
      pasteYank(ctx.editor, "after");
      ctx.editor.mode = "normal";
    },
    modes: ["normal"],
  },
  {
    id: "paste.before",
    keys: [["P"]],
    run: (ctx: CommandContext) => {
      pasteYank(ctx.editor, "before");
      ctx.editor.mode = "normal";
    },
    modes: ["normal"],
  },
  {
    id: "delete.toLineEnd",
    keys: [["D"]],
    run: (ctx: CommandContext) => {
      deleteToLineEnd(ctx.editor);
      ctx.editor.mode = "normal";
    },
    modes: ["normal"],
  },
  {
    id: "change.toLineEnd",
    keys: [["C"]],
    run: (ctx: CommandContext) => {
      deleteToLineEnd(ctx.editor);
      ctx.editor.mode = "insert";
    },
    modes: ["normal"],
  },
  {
    id: "substitute.line",
    keys: [["S"]],
    run: (ctx: CommandContext) => {
      substituteCurrentLine(ctx.editor);
      ctx.editor.mode = "insert";
    },
    modes: ["normal"],
  },
  {
    id: "edit.undo",
    keys: [["u"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        ctx.editor.insertRaw("\x1f");
      });
      ctx.editor.mode = "normal";
    },
    modes: ["normal"],
  },
  {
    id: "insert.before",
    keys: [["i"]],
    run: (ctx: CommandContext) => {
      ctx.editor.mode = "insert";
    },
    modes: ["normal"],
  },
  {
    id: "insert.after",
    keys: [["a"]],
    run: (ctx: CommandContext) => {
      getEditorOps(ctx.editor).moveCursor(0, 1);
      ctx.editor.mode = "insert";
    },
    modes: ["normal"],
  },
  {
    id: "insert.any",
    keys: [[ANY_KEY]],
    order: 0,
    run: (ctx: CommandContext) => {
      ctx.editor.insertRaw(ctx.data);
    },
    modes: ["insert"],
  },
  {
    id: "normal.enter",
    keys: [["escape"]],
    order: 100,
    run: (ctx: CommandContext) => {
      ctx.editor.mode = "normal";
    },
    modes: ["insert", "visual"],
  },
  {
    id: "visual.enter",
    keys: [["v"]],
    run: (ctx: CommandContext) => {
      ctx.editor.mode = "visual";
    },
    modes: ["normal"],
  },
] as const satisfies readonly Command[];

const motionCommands = [
  {
    id: "motion.right",
    keys: [["l"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        getEditorOps(ctx.editor).moveCursor(0, 1);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.left",
    keys: [["h"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        getEditorOps(ctx.editor).moveCursor(0, -1);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.down",
    keys: [["j"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        getEditorOps(ctx.editor).moveCursor(1, 0);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.up",
    keys: [["k"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        getEditorOps(ctx.editor).moveCursor(-1, 0);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.wordForward",
    keys: [["w"], ["W"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        const ops = getEditorOps(ctx.editor);
        ops.moveWordForwards();
        ops.moveCursor(0, 1);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.wordBackward",
    keys: [["b"], ["B"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        getEditorOps(ctx.editor).moveWordBackwards();
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.wordEnd",
    keys: [["e"], ["E"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        moveToWordEndForward(ctx.editor);
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.lineStart",
    keys: [["0"], ["^"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        const ops = getEditorOps(ctx.editor);
        ops.moveToLineStart();
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.lineEnd",
    keys: [["$"]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        const ops = getEditorOps(ctx.editor);
        ops.moveToLineEnd();
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.findForward",
    keys: [["f", ANY_KEY]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        const ops = getEditorOps(ctx.editor);
        ops.jumpToChar(ctx.key, "forward");
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.findBackward",
    keys: [["F", ANY_KEY]],
    run: (ctx: CommandContext) => {
      runCountedNormalMotion(ctx, () => {
        const ops = getEditorOps(ctx.editor);
        ops.jumpToChar(ctx.key, "backward");
      });
    },
    modes: ["normal"],
  },
  {
    id: "motion.firstLine",
    keys: [["g", "g"]],
    run: (ctx: CommandContext) => {
      const cursor = getCursor(ctx.editor);
      setCursor(ctx.editor, 0, cursor.col);
    },
    modes: ["normal"],
  },
  {
    id: "motion.lastLine",
    keys: [["G"]],
    run: (ctx: CommandContext) => {
      const cursor = getCursor(ctx.editor);
      const lastLine = Math.max(0, ctx.editor.getText().split("\n").length - 1);
      setCursor(ctx.editor, lastLine, cursor.col);
    },
    modes: ["normal"],
  },
  {
    id: "motion.unmappedNoop.z",
    keys: [["z"]],
    run: () => {},
    modes: ["normal"],
  },
] as const satisfies readonly Command[];

export const commands = [
  ...modeActionCommands,
  ...motionCommands,
] as const satisfies readonly Command[];
