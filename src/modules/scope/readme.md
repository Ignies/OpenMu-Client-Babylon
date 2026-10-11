# scope

Objects entering and leaving the hero's view: players, NPCs and monsters, summons, transformed
players, plus their moves and equipment changes. The entities live in the ECS world
(`Ecs.world`); this folder has no state of its own.

## Public API
- `spawnPlayer(world, { cls })`: adds a bare player entity (player rig, class scale, empty
  appearance). Re-exported by `src/app/logic.ts`; used by `app/offline.ts` and
  `ecs/systems/characterSelectSystem.ts`.

## How it works
- Every add first removes any entity with the same net id (`removeNetObject`, which also ends its buff
  looks: `UnRegisterBuff`, `WSclient.cpp:3175-3180`), then builds a new one.
  Ids are masked with `0x7fff`; for summons bit 15 is the create flag that plays the arrival
  (`WSclient.cpp:3113-3117`).
- NPCs, monsters and summons go through `addNpcToScope` in `objects.ts`, which also keeps a mid-walk
  entry walking, removes objects and names players and summons for other modules (party, guild, drops).
- Players: `addCharacterToScope` spawns with `spawnPlayer`, places them on the terrain, copies the
  PK state (`WSclient.cpp:804`), buffs with their looks (`applyObjectEffect`, `RegisterBuff`) and the
  visible equipment. The hero gets `localPlayer`
  (and `isGm`, attack and magic speed from the packet); other players get `interactable`
  (`ZzzInterface.cpp:8110`) and, from the extended packet, their own `speeds` for their clips.
- The hero is created on join (`CharacterInformation`, as `ReceiveJoinMapServer` does, WSclient.cpp:1081-1160)
  when there is none: its net id, class and name, at the packet's position, its gear from the inventory
  that follows. The self scope add rebuilds it; a server that never sends one (OpenMU after a character
  switch) still leaves the hero a body.
- Transformed players (`AddTransformedCharactersToScope`, 0x45): skin 0 is a normal player; the
  hero keeps the player rig with the skin's body; other players are drawn with the monster's model
  but keep the player identity (no `npcType`).
- Leaving scope sets `objOutOfScope`; a player fading out after a teleport is deferred
  (`deferLeave` in `ecs/systems/teleportSystem.ts`). The personal shop title goes with him.
- Appearance changes (0x25, `ReceiveChangePlayer`) only touch other players; the hero's look comes
  from the inventory (`Hero.syncPlayerAppearance`).

## Packets
- `CharacterInformation` / `CharacterInformationExtended`: the hero is created on join if there is none.
- `AddNpcsToScope`: NPCs and monsters enter view, each with its buffs (10 bytes and the buff list).
- `AddSummonedMonstersToScope` (0x1F): a player's summons, with the owner's name and buffs.
- `SummonHealthUpdate` (F3 20, `ReceiveSummonLife`): health percent of the hero's own summon.
- `AddCharactersToScope`: players, classic appearance layout.
- `AddCharacterToScopeExtended`: one player, extended appearance plus effect ids.
- `AddTransformedCharactersToScope` (0x45): players wearing a monster skin.
- `MapObjectOutOfScope`: objects leave view.
- `ObjectMoved`: instant move to a tile; stops any walk. The tile lands at once and the body is
  drawn sliding in over 15 ticks, the hero taking no input meanwhile, and a ball is kicked
  (`JumpTime`, WSclient.cpp:2127-2153; `ecs/systems/positionSlideSystem.ts`). `addNpcToScope` gives a
  `MonsterDef.ball` type its `ball` component.
- `ObjectWalked`: walk target for another object (the hero's own walk is ignored); a body whose file
  says its walk slides (the Crust) slides to the tile instead (`startWalkSlide`).
- `AppearanceChanged` / `AppearanceChangedExtended`: one equipment slot of a player changed.

## Depends on / used by
- uses: `economy` (shop titles), `controllers/item_rules/itemSerializer`,
  `core/inventoryConstants`, `controllers/actors`, `ecs/systems/teleportSystem`, `ecs/systems/positionSlideSystem`,
  `versions/shared/skills/skillVisuals` (`playSummonArrival`).
- used by: `src/app/logic.ts` (import and `spawnPlayer` re-export), `src/app/offline.ts`,
  `ecs/systems/characterSelectSystem.ts`. `warp/warpScopeHold.ts` holds these packets back while
  a map loads.

## Change it
- change how a player entity is built: `spawnPlayer` / `addCharacterToScope` in `net.ts`.
- change how an NPC or monster is built: `addNpcToScope` in `objects.ts`.
- show a new equipment slot on other players: `applyAppearanceChange` in `net.ts`.

## Tests
- `net.test.ts`: a player entering view wears its effects' looks; re-adding the body ends the old ones;
  the NPCs after one with buffs read right, its buffs registered; OpenMU's own master buff numbers are
  listed as their base effect.
- `heroOnJoin.test.ts`: the hero created on join at the character information position, and left alone when it exists.
