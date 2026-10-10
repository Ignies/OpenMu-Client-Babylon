# season6

Season 6 Episode 3, the default version and the one the client was written against
(OpenMU `-version:season6`, `VersionSeasonSix`).

## Public API
- `gameVersion` (`index.ts`): id `season6`, label `Season 6 Episode 3`, list tag `S6EP3`,
  client version `10404`, serial, SimpleModulus and Xor keys, `variantRank`, data paths and
  `features` (every flag on), no `modulesOff`, all three `miniGames`.
- `packets` (`packets/index.ts`): `ServerToClientPackets`, `ClientToServerPackets`,
  `ConnectServerPackets`, `ChangeMapServerInfoPacket`.
- `ui/index.ts`: `pregame` (login world 73, character world 74, the MU logo), `preload`,
  `MasterSkillsWindow`.
- `tables/index.ts`: re-exports the shared item, skill and monster tables and the jewel rules.

## How it works
- `variantRank` picks the classic layout when several generated packets share a code:
  plain name first, then `...075` / `...095` / `...097`, then `...Extended`.
- `packets/` adds four hand-written server packets to the generated set:
  - `mapServerMove.ts`: C1 B1 00, move to another game server (`WSclient.cpp:10328`).
  - `bandRelay.ts`: C1 FA, a band frame relayed by the ws proxy (`proxy/band/hub.ts`).
  - `pingRelay.ts`: C1 FB, a map ping relayed by the ws proxy (`proxy/ping/hub.ts`).
  - `modulePacket.ts`: C1/C2 E8, a module packet from our OpenMU plugin; the module router reads it
    (`src/modules/_api/router.ts`).
- `data/index.ts`: assets under `./Data/` (or `VITE_DATA_URL`) and `./game-assets/`, locale `Eng`,
  and the world folders a map entry reads: not World6 (Exile) or World55/56 and Object55/56 (the old
  character and login scenes, maps 54/55), which the trees hold and nothing reads.
- `ui/preload.ts`: the sprite sheets decoded before the start menu and on world entry.
- `ui/index.ts` reuses the shared login and character pages and the shared master skill window.

## Depends on / used by
- uses: `versions/shared/packets`, `versions/shared/ui`, `versions/shared/{items,skills,monsters}`
- used by: `versions/registry.ts`; `v097d` reuses the four hand-written packets

## Change it
- change a Season 6 only window: export it from `ui/index.ts` in `windows` with the shared `id`.
- add a hand-written packet: a class in `packets/` beside the others, then append it to
  `ServerToClientPackets` in `packets/index.ts`.

## Tests
- `packets/mapServerMove.test.ts`: parses the original C1 B1 00 layout and the ip terminator.
- `packets/bandRelay.test.ts`, `packets/pingRelay.test.ts`: read sub and sender, keep the shape
  the dispatcher resolves by.
- `packets/modulePacket.test.ts`: the module packet keeps the shape the dispatcher resolves by and
  is the only packet of its code in both versions' sets.
- `../registry.test.ts`: Season 6 keeps its login bytes, Xor keys and variant ranks.
