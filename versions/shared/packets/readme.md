# packets

The generated packet codecs: one class per packet for the game server (both directions) and the
connect server.

## Public API
- `ServerToClientPackets.ts`, `ClientToServerPackets.ts`, `ConnectServerPackets.ts`: one class per
  packet (static `Name`, `HeaderType`, `Code`, `SubCode`, `Length`, `Direction`, getters and
  setters per field), the enums they use, and an `as const` list of every class in the file.

## How it works
- `packetsDefinitions/*.xml` is a copy of OpenMU's
  `src/Network/Packets/{ServerToClient,ClientToServer,ConnectServer}/*.xml`.
- `bun run generate` runs `generate.ts`. It reads each XML with `HTMLRewriter`, builds the matching
  `.ts` file in memory and writes it over the old one (no index: `src/controllers/net/packets.ts`
  picks the active version's set). A class keeps only the read helpers (`_readString`, `_readDataView`) its getters call and a file only
  the imports its code uses, so the output passes `noUnusedLocals`.
- The XML holds every version's variants, so the output also has the `...075`, `...095`, `...097`
  and `...Extended` classes. A version's `variantRank` picks which one wins for a shared code.
- Packets OpenMU does not define (map-server move, band and ping relays, the module packet) are
  hand-written in `versions/season6/packets/`.

## Depends on / used by
- uses: `src/core/types` (`CharacterClassNumber`), `src/core/binaryUtils`
- used by: `versions/season6/packets`, `versions/v097d/packets`, module `net.ts` files and the
  socket dispatcher, through `@versions/shared/packets/*`

## Change it
- new or changed packet: edit the XML in `packetsDefinitions/` (or recopy it from OpenMU), then
  `bun run generate`. Never edit the generated `.ts` files by hand.
- change the output shape: edit `generate.ts` and regenerate.

## Tests
- None in this folder. `versions/v097d/variantRank.test.ts` and `versions/registry.test.ts` check
  variant choice by class name.
