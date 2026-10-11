# cloaks

Who wears which physics cloth (`RenderCharacter`'s `bCloak` and cloth set, ZzzCharacter.cpp:9162-9985):
the capes, the Dark Lord's hair and skirt, the Magic Gladiator's robe, the team cloaks. The cloth itself
(simulation, drawing, shadow) is the `cloth` controller; this folder only names the specs.

## Public API
- `cloaks(wearer, set, pants)` (`index.ts`): the rule, handed to `registerCloaks` when the folder loads
  (`app/boot.tsx` imports it). On the wearer's set it does what `RenderCharacter` does: builds the set
  once (`Create` per slot, `m_byNumCloth`), makes the skirt follow the armour, draws the slots its loop
  reaches, and returns the `CloakLight`; on the pants part's set, what `RenderPartObject` does.
- One file per use: `cape_of_lord.ts` (the Cape of Lord and the Mantle of Monarch's cape and straps),
  `cape_of_fighter.ts` (the Cape of Fighter and the Cape of Overrule's cape and straps), `robe.ts` (the
  Magic Gladiator's robe, msword03 under the Wing of Ruin), `dark_lord_hair.ts` (the Dark Lord's two
  strands of hair), `dark_lord_skirt.ts` (his skirt over the class's own body), `team_cloak.ts` (the duel
  and Battle Soccer colours, `teamLight`), `delete_cloth.ts` (the wing changes that reset the set, `tearsSet`),
  `monster_robes.ts` (the Death King's and the Nightmare's robes, `isDoppelganger`, the Crusts' `crustRobe`
  and Fred's), `magic_skeleton.ts` (the Magic Skeletons' cape, a mesh of their body made cloth),
  `soul_pants.ts` (the pants that are cloth, `pantsCloth`), `ring_bodies.ts` (the cloths a ring's body
  hangs on its wearer, `bodyCloths`).

## How it works
- `bCloak` (:9162-9186): on the player rig the Magic Gladiator class itself (`c->Class == CLASS_DARK`, so
  not the Duel Master), every Dark Lord and Rage Fighter; the Death King (55) and the Nightmare (361); never a
  Doppelganger (529-539, whose Dark Lord and Magic Gladiator copies are on the rig) and never in Chaos Castle.
  A player worn as a whole monster is no `MODEL_PLAYER` and wears none, unless that monster is one of the two.
- A team colour (:9188-9246) puts a cloak on anyone, Chaos Castle or not, and tints every cloth it wears
  (`CloakLight`; the hair's light keeps its own pulse). Battle Soccer: the hero's guild and the guild it
  plays by the hero's team, then the two teams the score names, red and blue (`SoccerObserver` is set by
  every score, for players and watchers alike, and cleared by a first score of 255). A duel only while the hero fights it: the enemy red, the
  hero blue; a spectator's duel is never enabled. A Dark Lord or a Rage Fighter then wears his cape
  without the item, anyone else the robe. A player in a monster's body is left out: the original hangs its
  class's cloths on that monster's bones.
- Slots are the original's indices. A cloth the loop skips (`continue`, :9926-9983) stays built and is
  neither stepped nor drawn; stepped again after the body moved far, it tears and the set is rebuilt. Its
  shadow is still laid where it was left (`AddClothesShadowTriangles` walks every built cloth below
  `m_byNumCloth`, ZzzBMD.cpp:2648-2710): a Dark Lord with a weapon and no cape lays a cape's shadow where
  his set was built, which never moves. Out of a cloak the set stays as it was, undrawn.
- `DeleteCloth` on a wing change resets the set, which the rule builds anew the same frame: for the hero
  when a cloth wing (the Wing of Ruin, a cape, the Mantle) goes on or comes off (NewUIMyInventory.cpp:1050-1083),
  for another player when the new wing is one, or the old one as the slot empties (WSclient.cpp:2474-2491), so
  a Magic Gladiator swapping the Wing of Ruin straight for another wing keeps its msword03 robe.
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
- The Death King (:9826-9832): slot 0 `Player\Robe03.tga` on the neck, keyed, with spheres on the back and the
  head. The Nightmare (:9833-9836): a `PCT_CYLINDER` of `Monster\nightmare_cloth.tga` round its bone 2.
  Both sit in the class-less branch, so a Dark Lord in either body still wears his own set.
- The rest (:9837-9846): slot 0 the robe, `Player\Robe01.jpg` in front and `Robe02.jpg` behind, opaque and
  culled, or `Item\msword03.tga` under the Wing of Ruin; worn by the Magic Gladiator whatever the wing.
- The Magic Skeletons 1-7 (monsters 89, 95, 112, 118, 124, 130, 143; not 433, whom the switch does not name)
  have their own case before `bCloak` (ZzzCharacter.cpp:8502-8539): mesh 2 of the body (`bsh02.tga`) made cloth
  (`CPhysicsClothMesh`), pinned on bone 18, heavy, two spheres on that bone; built once, stepped every frame,
  stun or not. Two more monsters hang their own the same way: the Mega Crust, Alpha Crust and Omega Wing a 5 x
  15 rubber strip 300 long from the neck (`Monster\iui02.tga`, the other two `iui03.tga`; :8818-8837) and Fred
  (`MODEL_FRED`, monster 508) `Monster\deasuler_cloth.tga` from its bone 10 (`Draw_RenderObject`,
  ZzzObject.cpp:540-561).
- A ring's body worn by a player (`KIND_PLAYER`, its `RenderPartObjectBody`, ZzzObject.cpp:8149-8417) hangs its
  own on the wearer's set, built before `bCloak` looks: the Illusion Temple's Mu Allies `skill\unitedsoldier_wing.tga`
  (held by stun) and Illusion Sorcerer `skill\illusionistcloth.tga` (the Halloween shape and gusts), the Jack
  O'Lantern `Monster\iui02.tga` (never held), and the game master's two strands of hair (ZzzCharacter.cpp:9464-9482),
  built and never stepped or drawn, the loop's cloaking test sitting inside its own negation. The set being built,
  a class's set is never made under these bodies (a Dark Lord in Jack's body has no cape); the class loop walks
  their cloths instead, so a Rage Fighter with his cape steps Jack's robe a second time.
- The pants part (`RenderPartObject`, ZzzObject.cpp:10608-10680), keyed on the model drawn (`Type`, the part's
  file): the Grand Soul Pants (`t_PantMale19`) a 5 x 8 grid on bone 17 drawn as the part's mesh 2
  (`PCT_OPT_MESHPROG`), the Dark Soul Pants (`PantMale23`) a 7 x 5 one, the Divine Pants (`PantMaleTest20`, the
  model `ZzzOpenData.cpp:174-181` loads for them) mesh 3 made cloth on bone 2 with five spheres down the legs. It
  is built once and stepped each time the part is drawn, stun or not: in the parts' pass and again in the shadow
  pass (ZzzCharacter.cpp:8590-8612, :9651; not on a Uniria or Dinorant out of town, under half alpha, in Icarus
  or Kalima). Other pants drop it with the body's set (`DeleteCloth(NULL, o, p)`, :10675-10678), as a tear of
  either does; under a ring's body no part is drawn and it is left alone. The original keeps the old cloth when
  one soul pants is swapped straight for another (drawing it over the new mesh); here the new part's mesh takes
  the set with it.
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
- `cloaks.test.ts`: each use's specs against the original's numbers, and who wears them (the two monsters,
  no Doppelganger, the seven Magic Skeletons, the three pants by their model, twice in the shadow pass, the Crusts,
  Fred, the four ring bodies on a player and the class loop over them).

## Notes
- Not ported: the Dark Phoenix's hair (ZzzCharacter.cpp:8904-8920), which hangs on the bones of its second body
  (`o->Type++`, Monster57), a body this client does not draw yet.
- `team_cloak.test.ts`: the duel and Battle Soccer colours, who they put a cloak on, and what it is.
