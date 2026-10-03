# scope

Objects entering and leaving the hero's view: players, NPCs and monsters, summons, transformed
players, plus their moves and equipment changes. The entities live in the ECS world
(`Store.world`); this folder has no state of its own.

## Public API
- `spawnPlayer(world, { cls })`: adds a bare player entity (player rig, class scale, empty
  appearance). Re-exported by `src/app/logic.ts`; used by `Store` and
  `ecs/systems/characterSelectSystem.ts`.

## How it works
- Every add first removes any entity with the same net id (`removeNetObject`), then builds a new one.
  Ids are masked with `0x7fff`; for summons bit 15 is the create flag that plays the arrival
  (`WSclient.cpp:3113-3117`).
- NPCs, monsters and summons go through `addNpcToScope` in `_shared/net_helpers.ts`.
- Players: `addCharacterToScope` spawns with `spawnPlayer`, places them on the terrain, copies the
  PK state (`WSclient.cpp:804`), buffs and the visible equipment. The hero gets `localPlayer`
  (and `isGm`, attack and magic speed from the packet); other players get `interactable`
  (`ZzzInterface.cpp:8110`) and, from the extended packet, their own `speeds` for their clips.
- Transformed players (`AddTransformedCharactersToScope`, 0x45): skin 0 is a normal player; the
  hero keeps the player rig with the skin's body; other players are drawn with the monster's model
  but keep the player identity (no `npcType`).
- Leaving scope sets `objOutOfScope`; a player fading out after a teleport is deferred
  (`deferLeave` in `ecs/systems/teleportSystem.ts`). The personal shop title goes with him.
- Appearance changes (0x25, `ReceiveChangePlayer`) only touch other players; the hero's look comes
  from the inventory (`Store.syncPlayerAppearance`).

## Packets
- `AddNpcsToScope`: NPCs and monsters enter view.
- `AddSummonedMonstersToScope` (0x1F): a player's summons, with the owner's name.
- `SummonHealthUpdate` (F3 20, `ReceiveSummonLife`): health percent of the hero's own summon.
- `AddCharactersToScope`: players, classic appearance layout.
- `AddCharacterToScopeExtended`: one player, extended appearance plus effect ids.
- `AddTransformedCharactersToScope` (0x45): players wearing a monster skin.
- `MapObjectOutOfScope`: objects leave view.
- `ObjectMoved`: instant move to a tile; stops any walk.
- `ObjectWalked`: walk target for another object (the hero's own walk is ignored).
- `AppearanceChanged` / `AppearanceChangedExtended`: one equipment slot of a player changed.

## Depends on / used by
- uses: `_shared/net_helpers.ts`, `economy` (shop titles), `items/itemSerializer`,
  `inventory/inventoryConstants`, `controllers/actors`, `ecs/systems/teleportSystem`,
  `versions/shared/skills/skillVisuals` (`playSummonArrival`).
- used by: `src/app/logic.ts` (import and `spawnPlayer` re-export), `src/app/store.ts`,
  `ecs/systems/characterSelectSystem.ts`. `warp/warpScopeHold.ts` holds these packets back while
  a map loads.

## Change it
- change how a player entity is built: `spawnPlayer` / `addCharacterToScope` in `net.ts`.
- change how an NPC or monster is built: `addNpcToScope` in `_shared/net_helpers.ts`.
- show a new equipment slot on other players: `applyAppearanceChange` in `net.ts`.

## Tests
- none yet.
