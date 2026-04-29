# Testing Notes

## Run

- Full suite: `pnpm test`
- Build only: `pnpm build`

## Test style in this repo

- Node test runner (`node:test`)
- Behavior-first assertions:
  - resulting text
  - resulting mode
  - resulting cursor

## Harness

- `test/harness.mjs`
  - `createEditor(text)`
  - `press(editor, ...keys)`
  - `ESC` constant

## Gotcha

For multiline input, initial cursor is often on the last line after `setText`.
Always confirm expected starting cursor in tests.

## Recommended pattern for new command work

1. Add/extend tests first.
2. Run `pnpm test` and confirm targeted failures.
3. Implement smallest possible change.
4. Re-run full test suite.
