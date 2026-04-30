# Pi Vim Motions Extension

Vim Motions extension and keybindings for [pi](https://pi.dev)

## How to install

- `pi install npm:pi-vim-motions`
- add into **~/.pi/keybindings.json**:

```json
{
  "tui.editor.cursorLeft": [
    "left",
    "ctrl+h"
  ],
  "tui.editor.cursorDown": [
    "down",
    "ctrl+j"
  ],
  "tui.editor.cursorUp": [
    "up",
    "ctrl+k"
  ],
  "tui.editor.cursorRight": [
    "right",
    "ctrl+l"
  ],
  "tui.select.down": [
    "down",
    "ctrl+n",
    "ctrl+j"
  ],
  "tui.select.up": [
    "up",
    "ctrl+p",
    "ctrl+k"
  ],
  "tui.editor.deleteToLineEnd": [
    "alt+k"
  ],
  "app.model.cycleForward": [
    "alt+p"
  ],
  "app.model.cycleBackward": [
    "shift+alt+p"
  ]
}
```

`app.model.cycleForward`, `app.model.cycleBackward` and
`tui.editor.deleteToLineEnd` conflict with what is usually used by neovim for
example as navigating selectors.

## Usage

- Default mode: **INSERT**
- `escape` in INSERT → NORMAL
- `escape` in NORMAL keeps base escape/cancel behavior
- `i` in NORMAL → INSERT
- `a` in NORMAL → move right one char, then INSERT
- `u` in NORMAL → undo (supports counts, e.g. `2u`)
- Unmapped printable keys in NORMAL are ignored (no text inserted)

## Implemented commands (current)

### Motions

- `h` / `j` / `k` / `l`: left/down/up/right
- `w` / `b` / `e`: word motions
- `W` / `B` / `E`: same as lowercase in current implementation
- `0` / `^`: line start
- `$`: line end
- `f<char>`: find next matching char on line
- `F<char>`: find previous matching char on line
- `gg`: first line
- `G`: last line
- Counts in normal mode (`3w`, `5l`, etc.)

### Delete

- `x`: delete char under cursor (stores deleted char in register)
- `d` enters pending operator state
- Supported completions:
  - `dd` (delete current line, stores linewise)
  - `dh` / `dl`
  - `dw` / `db` / `de` / `dW` / `dB` / `dE`
  - `d0` / `d^` / `d$`
  - `df<char>` / `dF<char>`
- `D`: delete to end of line
- If second key is unsupported, delete is canceled with no text change
- `escape` cancels pending delete
- Counts supported (`2x`, `2dd`, `d2w`)
- Mode stays NORMAL after delete commands

### Change / Substitute

- `C`: change to end of line (delete to EOL and enter INSERT)
- `S`: substitute current line (clear line and enter INSERT)

### Yank / Paste

- `y` enters pending operator state
- Supported completions:
  - `yy` (yank current line, linewise)
  - `yw` / `yb` / `ye` / `yW` / `yB` / `yE`
  - `y0` / `y^` / `y$`
  - `yf<char>` / `yF<char>`
- `Y`: yank to end of line
- `p`: paste after cursor (or below for linewise register)
- `P`: paste before cursor (or above for linewise register)
- If second key is unsupported, yank is canceled with no text change
- `escape` cancels pending yank
- Counts supported (`y3w` etc.)

## Regression expectations

- INSERT mode keeps normal typing behavior
- `enter` submits
- `shift+enter` inserts newline
- Control/system shortcuts (like `ctrl+c`, `ctrl+d`) continue to work

## Out of scope (v1)

In order of when its likely to be implemented:

- Visual mode
- redo: not implemented in pi itself
- Text objects (`diw`, `ci(`, etc.)
- Repeat (`.`), macros, named registers
- Search motions/repeats (`/`, `?`, `n`, `N`, `;`, `,`)
- Full WORD/edge-accurate Vim parity
- `;`/`,` repeat-find

## Development

This is its own package with its own tooling so that its not depending on pi's
environment for development. Just run `pnpm install` to pull necessary
dependencies and `pnpm test` to run the test suite.

I added some basic agent related things and fallow. You can of course make a
pull request if you have something you want to extend but please don't just let
the coding agent go ham on it.

Otherwise raise an issue and I can have a look at it.

Next step in this is probably to tidy up the commands.ts and introduce a bit
more extendable structure to it. I will see how I can extend pi. For now its
more so I can edit text properly inside pi.
