# cloaks

Who wears which physics cloth (`RenderCharacter`'s `bCloak` and cloth set, ZzzCharacter.cpp:9162-9985):
the capes, the Dark Lord's hair and skirt, the Magic Gladiator's robe, the team cloaks. The cloth itself
(simulation, drawing, shadow) is the `cloth` controller; this folder only names the specs.

## Public API
- `cloaks(wearer, set)` (`index.ts`): the rule, handed to `registerCloaks` when the folder loads
  (`app/boot.tsx` imports it). On the wearer's set it does what `RenderCharacter` does: builds the set
  once (`Create` per slot, `m_byNumCloth`), makes the skirt follow the armour, draws the slots its loop
  reaches, and returns the `CloakLight`.
- One file per use: `cape_of_lord.ts` (the Cape of Lord and the Mantle of Monarch's cape and straps),
  `cape_of_fighter.ts` (the Cape of Fighter and the Cape of Overrule's cape and straps), `robe.ts` (the
  Magic Gladiator's robe, msword03 under the Wing of Ruin), `dark_lord_hair.ts` (the Dark Lord's two
  strands of hair), `dark_lord_skirt.ts` (his skirt over the class's own body), `team_cloak.ts` (the duel
  and Battle Soccer colours, `teamLight`).

## How it works
- `bCloak` (:9162-9186): the Magic Gladiator class itself (`c->Class == CLASS_DARK`, so not the Duel
  Master), every Dark Lord and Rage Fighter; never in Chaos Castle. A body worn as a whole monster is no
  `MODEL_PLAYER` and wears none (`ClothSystem` skips it).
- A team colour (:9188-9246) puts a cloak on anyone, Chaos Castle or not, and tints every cloth it wears
  (`CloakLight`; the hair's light keeps its own pulse). Battle Soccer: the hero's guild and the guild it
  plays by the hero's team, then the two teams the score names, red and blue (`SoccerObserver` is set by
  every score, for players and watchers alike). A duel only while the hero fights it: the enemy red, the
  hero blue; a spectator's duel is never enabled. A Dark Lord or a Rage Fighter then wears his cape
  without the item, anyone else the robe.
- Slots are the original's indices. A cloth the loop skips (`continue`, :9926-9983) stays built and is
  neither stepped nor drawn; stepped again after the body moved far, it tears and the set is rebuilt. Its
  shadow is still laid where it was left (`AddClothesShadowTriangles` walks every built cloth below
  `m_byNumCloth`, ZzzBMD.cpp:2648-2710): a Dark Lord with a weapon and no cape lays a cape's shadow where
  his set was built, which never moves. Out of a cloak the set stays as it was, undrawn.
- Dark Lord (:9693-9776): slots 0 and 1 the hair on the head bone (`Monster\iui06.jpg`, rubber2 strands in
  their own gusts: the first a pulsing light with a sprite on each vertex, the second added), gone under a
  ring's body (`CheckDarkLordHair`); slot 2 the cape, drawn with the Cape of Lord (`Player\DarklordRobe.tga`) or the
  Mantle of Monarch (`Item\dl_redwings02.tga`, heavy, plus its straps in slots 4 and 5,
  `Item\dl_redwings03.tga`). No cape has a texture per item level: `Render` ignores the level. Slot 3 the
  skirt on the waist bone over the class's own body (no armour item): `Player\kaa.tga`, the Lord Emperor's
  `Player\dark3chima3.tga`, built with the set sticked at (0, 10, -5). The set counts 3 cloths, so the next
  frame the skirt is made again at (0, 8, -5) and counted, `PCT_CURVED` added to `PCT_STICKED`, which the
  shape switch reads as neither; armour on tears it off. Under the Mantle (6 cloths) the built skirt stays,
  a Lord Emperor's is torn off (`!= SKIN_CLASS_DARK_LORD`, :9888-9896), and one is made at (0, 8, -5) only
  when the armour comes off.
- Rage Fighter (:9777-9824): slot 0 the cape, drawn with the Cape of Fighter (`Item\NCcape.tga`) or the
  Cape of Overrule (`Item\monke_manto.TGA`, plus its straps in slots 1 and 2, `Item\monk_manto01.TGA`,
  blown out to each side by `PCT_ELASTIC_RAGE_L` / `_R`).
- The rest (:9837-9846): slot 0 the robe, `Player\Robe01.jpg` in front and `Robe02.jpg` behind, opaque and
  culled, or `Item\msword03.tga` under the Wing of Ruin; worn by the Magic Gladiator whatever the wing.
- A ring's body worn on the rig (`o->SubType`, the wearer's `skin`): the Illusion Temple's two
  (`illusionist`, `unitedsoldier`) skip every cloth (:9958-9961); any other hides the Magic Gladiator's
  robe but the skeleton rings' (`CheckDarkCloak`, ChangeRingManager.cpp:31-49, 95-101).

## Depends on / used by
- uses: `@/controllers/cloth` (specs, `PCT_*`), `@/controllers/actors` (`registerCloaks`, the wing numbers),
  `@/core/types` (classes), the modules' state the colours read: `@/modules/events/duel` (`duelEnemyId`),
  `@/modules/social/social` (`Social.guildWar`, `battleSoccer`, `myGuild`), `@/modules/guild` (`GuildMarks`).
- used by: `app/boot.tsx` (import), `ecs/systems/clothSystem.ts` through `cloaksFor`.

## Change it
- a new cloth: a spec in its use's file and a slot in the class's branch of `index.ts`, with its
  ZzzCharacter.cpp lines.

## Tests
- `cloaks.test.ts`: each use's specs against the original's numbers, and who wears them.
- `team_cloak.test.ts`: the duel and Battle Soccer colours, who they put a cloak on, and what it is.
