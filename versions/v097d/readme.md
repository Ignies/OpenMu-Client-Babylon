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
  `hasDataFile` answers "absent" instead of a load error.
- `ui/pregame/`: `shipScene.ts` (ship, sea, sky, wordmark and sun, ported from the login set
  piece), `loginPage.tsx` (the `0Account.OZT` plate) and `charactersPage.tsx` (the shared
  `character_list` drawn as rows on the `0New_Account01.OZT` plate).
- `ui/preload.ts`: cursor sprites and progress bars only; `worldSprites` is empty.

## Depends on / used by
- uses: `versions/shared/packets`, `versions/season6/packets`, `versions/shared/{items,skills,monsters}`,
  `versions/shared/ui/pages/character_select/character_list`
- used by: `versions/registry.ts`

## Change it
- `Data-v097d/` changed: regenerate the list with the command in `data/inventory.ts`.
- a window drawn the 0.97d way: export it in a `windows` list from `ui/index.tsx` with the shared id.

## Tests
- `variantRank.test.ts`: the winning packet variant per family that shares a code.
- `data/inventory.test.ts`: the inventory matches the files in `Data-v097d/`.
