# cloaks

Who wears which physics cloth (`RenderCharacter`'s `bCloak` and cloth set, ZzzCharacter.cpp:9162-9985):
the capes, the Dark Lord's hair and skirt, the Magic Gladiator's robe, the team cloaks. The cloth itself
(simulation, drawing, shadow) is the `cloth` controller; this folder only names the specs.

## Public API
- `cloaks(wearer, out)` (`index.ts`): the rule, handed to `registerCloaks` when the folder loads
  (`app/boot.tsx` imports it). It fills `out` with a spec per cloth slot (`m_pCloth[i]`, null where the
  original draws none) and returns the `CloakLight`.
- One file per use: `cape_of_lord.ts` (the Cape of Lord and the Mantle of Monarch's cape and straps).

## How it works
- `bCloak` (:9162-9186): the Magic Gladiator class itself (`c->Class == CLASS_DARK`, so not the Duel
  Master), every Dark Lord and Rage Fighter; never in Chaos Castle. A body worn as a whole monster is no
  `MODEL_PLAYER` and wears none (`ClothSystem` skips it).
- Slots are the original's indices, so a cloth keeps its swing while its spec stays. A cloth the
  original builds but skips drawing (`continue`, :9926-9983) is null here: it is not simulated either,
  and comes back built fresh, which is what the original's stale cloth tearing and rebuilding gives.
- Dark Lord (:9693-9776): slot 2 the cape, drawn with the Cape of Lord (`Player\DarklordRobe.tga`) or the
  Mantle of Monarch (`Item\dl_redwings02.tga`, heavy, plus its straps in slots 4 and 5,
  `Item\dl_redwings03.tga`). Neither cape has a texture per item level: `Render` ignores the level.

## Depends on / used by
- uses: `@/controllers/cloth` (specs, `PCT_*`), `@/controllers/actors` (`registerCloaks`, the wing numbers),
  `@/core/types` (classes).
- used by: `app/boot.tsx` (import), `ecs/systems/clothSystem.ts` through `cloaksFor`.

## Change it
- a new cloth: a spec in its use's file and a slot in the class's branch of `index.ts`, with its
  ZzzCharacter.cpp lines.

## Tests
- `cloaks.test.ts`: each use's specs against the original's numbers, and who wears them.
