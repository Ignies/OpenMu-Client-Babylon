# Chat emojis

Each folder here is one pack, each `.webp` in it one emoji. The client finds
them when it is built, so adding emojis is only adding files.

```
src/emojis/
  dark_knight/
    dk_love.webp      -> :dk_love:
    dk_wave.webp      -> :dk_wave:
```

- **The file name is the code** players type or pick: `dk_love.webp` is sent
  as `:dk_love:`. Lowercase letters, digits and `_` only, at most 32
  characters. Chat only carries plain ASCII, so nothing else would survive.
- **Names are unique across all packs.** Start them with a short pack prefix
  (`dk_`, `dw_`). A duplicate or a badly named file is left out and fails the
  tests.
- **Square pictures, 128 x 128.** They are drawn at the height of a chat line
  in the log and larger over a character's head. Animated webp animates.
- The pack's name in the picker comes from its folder: `dark_knight` shows
  as Dark Knight. Packs and emojis are listed alphabetically.
- Players whose client does not have an emoji see its code as text.
