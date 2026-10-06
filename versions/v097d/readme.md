# v097d

MU 0.97d, the second version the client carries. OpenMU has no 0.97d data initializer, so a
0.97d world is seeded from `Version095d`; the protocol side is real (`ClientVersion(0, 97)`).

## Public API
- `gameVersion` (`index.ts`): id `v097d`, label `MU 0.97d`, list tag `V097D`, client version
  bytes `09704` (stored mangled), serial, pre-Season 6 Xor32 key, `variantRank`, data paths and
  `modules` (no master skills, sockets, ancient, harmony, Dark Lord, Summoner, Rage Fighter,
  MU Helper, item hotkeys, cash shop or Season 6 quest dialogs).
- `packets` (`packets/index.ts`): the shared generated set plus Season 6's four hand-written
  packets. Nothing extra to generate.
- `ui/index.tsx`: `pregame` (the ship scene), `preload`, `MasterSkillsWindow` (renders nothing).
- `tables/index.ts`: still the Season 6 tables; its header says what each should become.

## How it works
- `variantRank` mirrors OpenMU's plug-in pick for a 0.97 client: `...097`, then `...095`, then
  the `...075` families in `PREFERRED_075`, then the classic layout, other `...075`, and
  `...Extended` last.
- `data/index.ts`: the period tree at `./Data-v097d/` (or `VITE_DATA_URL_V097D`), converted assets
  at `./game-assets-v097d/`, empty locale. `data/inventory.ts` lists every file in that tree so
  `hasDataFile` answers "absent" instead of a load error. `data/assets.ts` lists what
  `public/game-assets-v097d/` holds; any other converted file is Season 6's (`borrows`): only a
  file whose 0.97d source differs from Season 6's is converted or copied. `lacks` keeps Season 6's
  extra Lorencia grass cards (`TileGrass02/03.OZT`) out: 0.97d's World1 ships only `TileGrass01`.
- Worlds: the shared map entries serve 0.97d's World1..World12 (World6, Exile, has no entry).
  Only the terrain files whose source differs from Season 6's are copied (`World2`, `3`, `7`, `8`,
  `9`, `11`: 21 files) and only the models whose conversion differs (`Object3`: 40 of the 97
  Devias BMDs that differ; `Object10/Object03`, whose `kni00/01` textures differ); the rest of
  `World2..12` / `Object2..12` is Season 6's, byte-identical. The `.jpg` / `.tga` intermediates
  are not copied: nothing loads them (`tools/assetsIndex.ts`).
- `gate.bmd`: 100 records of nine BYTEs (`data.gates`); Season 6's reader expected 512 of 14 and
  threw, so 0.97d had no gates. The file is spelled `gate.bmd`, the name the client asks for.
- The sign plates (`Object1/notice.OZJ`, `Object3/snotice*.OZJ`, `Object7/notice.OZJ`) are
  Season 6's bytes in 0.97d's client and are read from `Data/` (`borrows.folderPaths`);
  `Data-v097d/` never shipped them, so the plate fetched the page's HTML and failed to decode.
- `data/sounds.ts`: the 42 sounds and 1 track whose 0.97d file differs from Season 6's original
  (hashed against the Season 6 `.wav` / `.mp3`), shipped as the period `.wav` / `.mp3`. The other
  235 sounds and 6 tracks play Season 6's `.ogg`.
- `ui/pregame/`: `shipScene.ts` (ship, sea, sky, wordmark and sun, ported from the login set
  piece), `loginPage.tsx` (the `0Account.OZT` plate) and `charactersPage.tsx` (the shared
  `character_list` drawn as rows on the `0New_Account01.OZT` plate).
- `ui/preload.ts`: cursor sprites and progress bars before the world; `worldSprites` is Season 6's
  list, because the in-game HUD and windows are still Season 6's.
- The in-game HUD reads Season 6's interface sheets from `Data/` wherever the period
  `Interface/` has none of that name (`borrows.folderPaths: 'interface/'`); the only shared names
  are the cursors, `FontTest.OZT` and the progress bars, which stay 0.97d's. The corner minimap
  shows Season 6's picture for World1, 2, 4 and 5, whose terrain is Season 6's; Devias, Atlans,
  Tarkan and Icarus have none (0.97d itself had no minimap), so there the corner and TAB show
  nothing.

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
  chain), no item hot-key belt, no MU Helper.
- Each window becomes a `windows` override in `ui/index.tsx` with the shared id; `worldSprites`
  then lists its sheets instead of Season 6's.

## Depends on / used by
- uses: `versions/shared/packets`, `versions/season6/packets`, `versions/shared/{items,skills,monsters}`,
  `versions/shared/ui/pages/character_select/character_list`
- used by: `versions/registry.ts`

## Change it
- `Data-v097d/` changed: regenerate the list with the command in `data/inventory.ts`.
- `public/game-assets-v097d/` changed: regenerate `data/assets.ts` with the command in it.
- a window drawn the 0.97d way: export it in a `windows` list from `ui/index.tsx` with the shared id.

## Tests
- `variantRank.test.ts`: the winning packet variant per family that shares a code.
- `data/inventory.test.ts`: the inventory matches the files in `Data-v097d/`; `gate.bmd` is spelled
  the way the client asks for it.
- `data/assets.test.ts`: `assets.ts` matches the files in `public/game-assets-v097d/`.
- `data/served.test.ts`: every terrain file, tile and placed object model of each world, and
  every sound key, resolves to a file that exists, in its case; Lorencia grows grass from its one
  card only; the gate table decodes; the sign plates and the borrowed minimap pictures resolve.
- `ui/preload.test.ts`: every world sheet it preloads is read from a tree that has it.
