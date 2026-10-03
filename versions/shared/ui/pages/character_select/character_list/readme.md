# character_list

The account's character list, used by every character page: the shared `CharactersPage`
(Season 6, `_template`) and the 0.97d `V097dCharactersPage`.

## Public API
- `CharacterList` (`index.tsx`): props `source` (the Store), `look`, optional `onList`.
  - `look="lineup"`: the name plate over the 3D line-up (`../CharacterSelectionPlate.tsx`); the
    actors themselves are drawn by `src/ecs/systems/characterSelectSystem.ts`.
  - `look="rows"` with `row={ x, y, width, height }`: one button per character (name, `Lv N`),
    classes `char-list-row`, `is-selected`, `char-list-level`; the page styles them.
  - `onList`: called when a new list arrives (Season 6 clears its "connecting" guard).
- `CharacterListSource`: what `source` must have; the Store satisfies it.
- `selectedCharacter(list, focused)`, `hasFreeSlot(list)`, `listStatus(state, prompt)`
  (`roster.ts`, re-exported).

## How it works
- On mount it sends `refreshCharactersListRequest`, then stores every `CharacterList`
  (list, unlock flags, loading off) and `CharacterFocused` (focused name) packet into `source`.
- A row click focuses the character and sends `focusCharacterRequest`, with the UI click sound.
  Rows follow the server's order; empty slots take no row.
- `listStatus` prompts: `pick` (line-up: shown only while nothing is selected, "select" once
  there are characters) and `empty` (0.97d: "loading" even with a selection, "select" over an
  empty list).
- Five characters per account (`MAX_CHARACTERS`); Create is enabled below that.

## Change it
- a new look: add it to `CharacterListProps` and draw it in `index.tsx`.
- move the packet handling into `src/modules/character_select`: then drop `source`.

## Tests
- `roster.test.ts`: selection, free slot, every status input for both prompts, row order.
