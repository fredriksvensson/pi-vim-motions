# Agent Context (Quick Start)

This file is a fast-path summary for AI agents working in this repo.

- Project uses `pnpm`; key checks: `pnpm test`, `pnpm build`, `pnpm typecheck`.
- Main logic:
  - `src/index.ts` for `VimMotionsEditor`, modes, key parsing/trie.
  - `src/commands.ts` for motions/operators/yank/paste/delete behavior.
  - `src/editor-ops.ts` for typed editor operation wrappers.
  - `test/\*.test.mjs` for behavior tests.
- Test caveat: after `createEditor(...setText...)`, cursor starts on the last line. Many tests must move cursor first.
- Operator flow: d/y enter operatorPending; next key selects target; escape or unsupported continuation cancels.
- Register model: per-editor WeakMap, supports linewise and charwise/rangewise yanks/deletes, with p/P paste.

For testing see: `docs/TESTING_NOTES.md`
