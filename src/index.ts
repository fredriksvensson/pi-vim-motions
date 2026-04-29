import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { parseKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
  ANY_KEY,
  commands,
  type Command,
  type Key,
  type Mode,
} from "./commands.js";
import { getEditorOps } from "./editor-ops.js";

const MODE_LABEL: Record<Mode, string> = {
  normal: " NORMAL ",
  insert: " INSERT ",
  visual: " VISUAL ",
  operatorPending: " O-PENDING ",
};

interface KeyNode {
  commands: Command[];
  children: Map<Key, KeyNode>;
  supportedModes: Set<Mode>;
}

function getNextTrieNodes(nodes: readonly KeyNode[], key: Key): KeyNode[] {
  const nextNodes: KeyNode[] = [];

  for (const node of nodes) {
    const exact = node.children.get(key);
    if (exact) nextNodes.push(exact);

    const any = node.children.get(ANY_KEY);
    if (any) nextNodes.push(any);
  }

  return nextNodes;
}

function collectSupportedModes(node: KeyNode): Set<Mode> {
  const modes = new Set<Mode>();

  for (const command of node.commands) {
    for (const mode of command.modes) modes.add(mode);
  }

  for (const child of node.children.values()) {
    for (const mode of collectSupportedModes(child)) modes.add(mode);
  }

  node.supportedModes = modes;
  return modes;
}

export function buildTrie(commands: readonly Command[]): KeyNode {
  const root: KeyNode = { commands: [], children: new Map(), supportedModes: new Set() };

  for (const command of commands) {
    for (const keySequence of command.keys) {
      let node = root;
      for (const key of keySequence) {
        let child = node.children.get(key);
        if (!child) {
          child = { commands: [], children: new Map(), supportedModes: new Set() };
          node.children.set(key, child);
        }
        node = child;
      }

      node.commands.push(command);
      node.commands.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
    }
  }

  collectSupportedModes(root);
  return root;
}

function getCommandOrder(command: Command): number {
  return command.order ?? 0;
}

function matchesMode(command: Command, mode?: Mode): boolean {
  return !mode || command.modes.includes(mode);
}

function findBestCommand(
  nodes: readonly KeyNode[],
  mode?: Mode,
): Command | undefined {
  const candidates = nodes.flatMap((node) => node.commands);
  const matching = candidates.filter((command) => matchesMode(command, mode));

  return matching.reduce<Command | undefined>((best, command) => {
    if (!best || getCommandOrder(command) > getCommandOrder(best)) return command;
    return best;
  }, undefined);
}

export function matchTrie(
  keys: readonly Key[],
  trie: KeyNode,
  mode?: Mode,
): Command | undefined {
  let nodes: KeyNode[] = [trie];

  for (const key of keys) {
    nodes = getNextTrieNodes(nodes, key);
    if (nodes.length === 0) return undefined;
  }

  return findBestCommand(nodes, mode);
}

function isPrintableInput(data: string): boolean {
  return data.length === 1 && data >= " " && data !== "\x7f";
}

export class VimMotionsEditor extends CustomEditor {
  private _mode: Mode = "insert";
  private readonly commandTrie: KeyNode = buildTrie(commands);
  private keys: Key[] = [];

  constructor(...args: ConstructorParameters<typeof CustomEditor>) {
    super(...args);
  }

  render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length === 0) return lines;

    const label = MODE_LABEL[this.mode];
    const lastLine = lines.length - 1;

    if (visibleWidth(lines[lastLine]!) >= label.length) {
      lines[lastLine] =
        truncateToWidth(lines[lastLine]!, width - label.length, "") + label;
    }

    return lines;
  }

  set mode(mode: Mode) {
    this._mode = mode;
  }

  get mode(): Mode {
    return this._mode;
  }

  override setText(text: string): void {
    super.setText(text);
    getEditorOps(this).moveToLineStart();
  }

  private findNodes(keys: readonly Key[]): KeyNode[] {
    let nodes: KeyNode[] = [this.commandTrie];

    for (const key of keys) {
      const nextNodes = getNextTrieNodes(nodes, key);
      if (nextNodes.length === 0) return [];
      nodes = nextNodes;
    }

    return nodes;
  }

  private hasTriePrefix(keys: readonly Key[], mode: Mode): boolean {
    const nodes = this.findNodes(keys);
    return nodes.some((node) => node.supportedModes.has(mode));
  }

  insertRaw(data: string): void {
    super.handleInput(data);
  }

  private parseInputKey(data: string): Key | undefined {
    return parseKey(data) ?? (data.length === 1 ? data : undefined);
  }

  private resetPendingSequence(): void {
    this.keys = [];

    if (this.mode === "operatorPending") {
      this.mode = "normal";
    }
  }

  private fallbackInput(data: string): void {
    if (this.mode === "insert") {
      this.insertRaw(data);
      return;
    }

    if (isPrintableInput(data)) return;

    this.insertRaw(data);
  }

  handleInput(data: string): void {
    const key = this.parseInputKey(data);
    if (!key) {
      if (this.mode === "insert") this.insertRaw(data);
      return;
    }

    this.keys.push(key);

    const command = matchTrie(this.keys, this.commandTrie, this.mode);
    if (command) {
      command.run({ editor: this, key, data });
      this.keys = [];
      return;
    }

    if (this.hasTriePrefix(this.keys, this.mode)) return;

    this.resetPendingSequence();
    this.fallbackInput(data);
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent(
      (tui, theme, keybindings) =>
        new VimMotionsEditor(tui, theme, keybindings),
    );
  });
}
