# v097d

MU 0.97d, the second version the client carries. OpenMU has no 0.97d data initializer, so a
0.97d world is seeded from `Version095d`; the protocol side is real (`ClientVersion(0, 97)`).

## Public API
- `gameVersion` (`index.ts`): id `v097d`, label `MU 0.97d`, list tag `V097D`, client version
  bytes `09704` (stored mangled), serial, pre-Season 6 Xor32 key, `variantRank`, data paths,
  `features` (no master skills, sockets, ancient sets, Dark Lord, Summoner or Rage Fighter; the
  Magic Gladiator is in; three fixed potion slots), `modulesOff: ['mu_helper']` and `miniGames`
  (Blood Castle and Devil Square).
- `packets` (`packets/index.ts`): the shared generated set plus Season 6's four hand-written
  packets. Nothing extra to generate.
- `ui/index.tsx`: `pregame` (the ship scene), `preload`, `MasterSkillsWindow` (renders nothing).
- `tables/index.ts`: still the Season 6 tables; its header says what each should become.

## What is 0.97d's, what is Season 6's, what is missing
- 0.97d's own, from the 0.97d client's `Data/` (`references/0.97d/StoneAgeMu/Data`), converted
  or copied only where its source differs from Season 6's (`public/game-assets-v097d/`, listed
  in `data/assets.ts`):
  - From the first Lorencia conversion, the 174 files Season 6 has no byte-identical copy of
    (their BMD or the textures they bake differ, or Season 6 has no such file): 115 Player,
    48 Item, 3 Monster, 3 NPC and 3 Skill models, and World1's `EncTerrain1.att` / `.obj`. The
    589 byte-identical ones (all of Object1 and Logo among them) were deleted and are borrowed.
  - World2, 3, 7, 8, 9 and 11: the 21 terrain files that differ (`EncTerrain<n>.*`,
    `TerrainHeight.OZB`, `TerrainLight.OZJ`). The `.jpg` / `.tga` intermediates are not copied:
    nothing loads them (`tools/assetsIndex.ts`).
  - Models: 40 Devias (`Object3`) GLBs, out of the 97 BMDs whose bytes differ (the other 57
    convert to Season 6's exact GLB), and `Object10/Object03` (its `kni00/01` textures differ).
  - Sounds (`data/sounds.ts`): 42 of the 278 `Sound/` files and `Music/MuTheme.mp3` differ from
    Season 6's originals (hashed against the Season 6 `.wav` / `.mp3`) and ship as the period
    `.wav` / `.mp3`. `mGiantWalk.wav` has no key in the catalogue and is not copied.
  - The period `Data/` tree (`Data-v097d/`, `data/inventory.ts`): interface, logo, `Local/`
    tables, effect textures, leaves, the Atlans water and `gate.bmd`.
- Season 6's, read from its tree (`borrows` in `data/index.ts`):
  - every converted file 0.97d does not ship: the rest of World2..12 and Object2..12
    (byte-identical), the 235 identical sounds and 6 tracks, and whatever Season 6 code asks for
    that 0.97d never had (effect models, later sounds), so no request answers the page's HTML.
    Except what it `lacks`: Season 6's extra Lorencia grass cards (`TileGrass02/03.OZT`); 0.97d's
    World1 grows grass from `TileGrass01` only.
  - from `Data/` (`borrows.folderPaths`): the in-game HUD and window art wherever the period
    `Interface/` has no sheet of that name (only the cursors, `FontTest.OZT` and the progress
    bars share a name, and stay 0.97d's); the minimap pictures of World1, 2, 4 and 5, whose
    terrain is Season 6's; the sign plates (`Object1/notice.OZJ`, `Object3/snotice*.OZJ`,
    `Object7/notice.OZJ`), Season 6's bytes in 0.97d's client, which `Data-v097d/` never shipped.
  - the map entries (`versions/shared/maps/`): object classes, lighting, sound and weather rows
    are the Season 6 port's.
- Missing:
  - World6 (Exile, map 5): no shared map entry claims it, so it is not converted. 0.97d's
    `gate.bmd` leads there (gates 80-83, from Lorencia at level 150); OpenMU Version095d defines
    the map with no gate or spawn.
  - A minimap for Devias, Atlans, Tarkan and Icarus (0.97d had none at all): the corner and TAB
    show nothing there.
  - The 0.97d HUD and windows (below), character creation on the 0.97d screen, and 0.97d's own
    item / skill / monster tables.

## How it works
- `variantRank` mirrors OpenMU's plug-in pick for a 0.97 client: `...097`, then `...095`, then
  the `...075` families in `PREFERRED_075`, then the classic layout, other `...075`, and
  `...Extended` last.
- `data/index.ts`: the period tree at `./Data-v097d/` (or `VITE_DATA_URL_V097D`), converted assets
  at `./game-assets-v097d/`, empty locale, and what it borrows from Season 6's `./Data/` and
  `./game-assets/`. `data/inventory.ts` lists every file in the period tree so `hasDataFile`
  answers "absent" instead of a load error for what nobody lends.
- `gate.bmd`: 100 records of nine BYTEs (`data.gates`: Flag, Map, x1, y1, x2, y2, Target, Angle,
  Level). Season 6's reader expected 512 records of 14 and threw, so 0.97d had no gates; the file
  is spelled `gate.bmd`, the name the client asks for.
- Worlds: the shared map entries serve World1..World12 but World6; their tile slots all name a
  file 0.97d's folders have. A few object types its terrain places have no `ObjectNN.bmd` in
  either tree (Season 6's terrain places them too): the original draws nothing there.
- `ui/pregame/`: `shipScene.ts` (ship, sea, sky, wordmark and sun, ported from the login set
  piece), `loginPage.tsx` (the `0Account.OZT` plate) and `charactersPage.tsx` (the shared
  `character_list` drawn as rows on the `0New_Account01.OZT` plate).
- `ui/preload.ts`: cursor sprites and progress bars before the world; `worldSprites` is Season 6's
  list, because the in-game HUD and windows are still Season 6's.

## What it has and has not, beyond the flags
- Harmony jewels and refine stones are Season 3: 0.97d has none. Nothing in `src/` asks, so it
  is not a flag; the item tables (`tables/`) are where it will show.
- `events` stays on: the client has World10 and OpenMU Version095d runs Devil Square. Blood Castle
  has its map (World12) and no server side yet; Chaos Castle is not in 0.97d (no World19, and its
  `NpcName` table has the Archangel and Charon but no Chaos Castle monster), so `miniGames` leaves
  it out and the HUD schedule neither draws nor polls it.
- Potion slots (`features.itemHotkeys`: three, not bindable): Q / W / E drink healing, mana and
  antidote, the slots its `Menu02.OZJ` art has and its key help lists (`Local/Text.bmd` 130-132;
  134 binds only skills with Ctrl). No R slot (shield potions are Season 3) and no Ctrl+key or
  drop binding (Season 6's `CNewUIItemHotKey`). The frame is still Season 6's art, so its painted
  R box stays empty and answers no key until the 0.97d bar is drawn.
- `quests` stays on: it carries the legacy chain 0.97d has (`Local/Quest.bmd`, OpenMU
  `NpcWindow.LegacyQuest`). Its Season 6 quest log and NPC dialogue windows stay too, never fed
  by a 0.95d server; turning those off alone means splitting the module.

## A 0.97d HUD (later wave)
What drawing the in-game interface the 0.97d way needs, none of it built yet:
- Art: its own 97-file `Interface/`. The bottom bar is `Menu01.OZJ`, `Menu02.OZJ`, `Menu03.OZJ`,
  `Menu04.OZT` (and the `Menu01_new` / `Menu03_new` / `Menu03_new_AG` variants), the gauges
  `Menu_Red` / `Menu_Blue` / `Menu_Green`, the buttons `Menu_Character`, `Menu_Inventory`,
  `Menu_Party`, the skill icons `Skill.OZJ`. Windows: the inventory slots `Item_*.OZJ`,
  `InventoryBox2`, `Money_01/02`; dialogs `Message_box*`, `dialogue1/2`, `ok` / `cancel` /
  `exit` / `buy` / `sell` / `repair` / `lock_01..04`; trade (`Trading_line`, `accept_box01/02`),
  the chaos machine (`mix_button1/2`), guild (`Guild.OZJ`, `guild.OZT`), stat points
  (`Level_box`, `level01`, `level_01/02`); the chat window `nis_*` (frames, buttons, bar).
- Layout: the pre-`NewUI` interface the 0.97d binary draws (640x480, the bar across the
  bottom); the reference source here is Season 6's, so positions are measured off the art.
- Missing outright: no minimap, no skill tree, no quest log windows (0.97d has the legacy
  chain), no R potion slot and no slot binding, no MU Helper.
- Each window becomes a `windows` override in `ui/index.tsx` with the shared id; `worldSprites`
  then lists its sheets instead of Season 6's, and `interface/` leaves `borrows.folderPaths`.

## Depends on / used by
- uses: `versions/shared/packets`, `versions/season6/packets`, `versions/season6/data` (the
  roots it borrows), `versions/season6/ui/preload` (the world sheets),
  `versions/shared/{items,skills,monsters}`,
  `versions/shared/ui/pages/character_select/character_list`
- used by: `versions/registry.ts`

## Change it
- `Data-v097d/` changed: regenerate the list with the command in `data/inventory.ts`.
- `public/game-assets-v097d/` changed: regenerate `data/assets.ts` with the command in it.
- convert another 0.97d file: hash its source against Season 6's first; convert it
  (`MU_DATA=<0.97d Data> GLB_OUTPUT=<scratch folder> bun run tools/bmdToGlb.ts <folder>`) or copy
  it into `public/game-assets-v097d/` only when the result differs from Season 6's file, then
  regenerate `data/assets.ts`.
- a window drawn the 0.97d way: export it in a `windows` list from `ui/index.tsx` with the shared id.

## Tests
- `variantRank.test.ts`: the winning packet variant per family that shares a code.
- `modules.test.ts`: MU Helper is off, `events` and `quests` stay; the HUD times Blood Castle and
  Devil Square only.
- `itemHotkeys.test.ts`: its own key help (`Local/Text.bmd` 130-134) names Q / W / E and binds
  only skills, so the bar draws three fixed slots.
- `data/inventory.test.ts`: the inventory matches the files in `Data-v097d/`; `gate.bmd` is spelled
  the way the client asks for it.
- `data/assets.test.ts`: `assets.ts` matches the files in `public/game-assets-v097d/`.
- `data/served.test.ts`: every terrain file, tile and placed object model of each world, every
  item, class body, monster and NPC model, and every sound key, resolves to a file that exists,
  in its case; Lorencia grows grass from its one card only; the gate table decodes; the sign plates and the borrowed minimap pictures resolve.
- `ui/preload.test.ts`: every world sheet it preloads is read from a tree that has it.
