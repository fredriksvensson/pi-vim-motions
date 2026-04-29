# Implementation Status

This is the practical status snapshot for commands.

## Implemented

### Modes

- Insert mode default
- `escape` => normal mode
- `i`, `a`
- operator pending mode for `d` and `y`

### Motions

- `h`, `j`, `k`, `l`
- `w`, `b`, `e`
- `W`, `B`, `E` (currently same behavior as lowercase)
- `0`, `^`, `$`
- `f<char>`, `F<char>`
- `gg`, `G`
- Counts for normal motions (e.g. `3w`)

### Delete

- `x`
- `dd`
- `dh`, `dl`
- `dw`, `db`, `de`, `dW`, `dB`, `dE`
- `d0`, `d^`, `d$`
- `df<char>`, `dF<char>`
- `D`
- Counts (`2x`, `2dd`, `d2w`)

### Change/Substitute

- `C`
- `S`

### Yank/Paste

- `yy`
- `yw`, `yb`, `ye`, `yW`, `yB`, `yE`
- `y0`, `y^`, `y$`
- `yf<char>`, `yF<char>`
- `Y`
- `p`, `P`
- Counts (`y3w`)

### Undo

- `u` in normal mode (supports counts)

## Missing (known)

- Text objects (`diw`, `ci(`, etc.)
- Dot-repeat (`.`), macros, named registers
- Search motions/repeats (`/`, `?`, `n`, `N`, `;`, `,`)
- Full WORD/edge-accurate Vim parity
