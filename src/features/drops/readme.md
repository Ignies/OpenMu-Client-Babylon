# drops

Items and zen on the ground: the drop packets, the drop entity and model, the name colour tier
and the loot filter for the ALT name overlay.

## Public API
- none for packets. `net.ts` registers its handlers when `src/app/logic.ts` imports it.
- `DropObject`: the model class of a drop (frozen pose, zen coin pile, the fall). `setPileFall(height)`.
- `dropTier(drop)`, `DROP_TIER_COLOURS`, `HIGH_DROP_LEVEL` (7): name colour and ground glow tier.
- `dropPassesLootFilter(drop)`, `lootZenThreshold(step)`, `LOOT_ZEN_MAX`: which names the latched overlay keeps.
- `archangelWeapon(level)`: the Divine weapon a Weapon of Archangel stands for (group, num).

## How it works
- `ItemsDropped` adds one entity per item with `droppedItem`, `modelFactory: DropObject` and a name
  (`RenderItemName`, ZzzInventory.cpp:6714). A fresh drop plays its sound (ZzzObject.cpp:5997-6002 / :6198).
- `dropModelProxy.ts` ports `CreateItem`'s per-level model swap (ZzzObject.cpp:6056-6116): Box of Luck by level,
  candy boxes, Rena +1/+2, quest items, Weapon of Archangel, Wizards Ring. The pose follows the shown model.
- The resting pose and height come from `controllers/actors/itemAngle.ts`.
- Zen: `zenPile.ts` ports `RenderZen` (ZzzObject.cpp:6327): coin count from the amount (3 to 12), scattered
  from a 100-value `RandomTable`. Two departures: the pile is 1.5x wider, and the radius uses a square root
  so the coins spread over the disc. `DropObject` draws the coins as thin instances.
- Leaving view (`ItemDropRemoved`) marks the entity `objOutOfScope`, like any object leaving scope.
- Picking up and dropping are `Store` actions: `pickupItemRequest`, `dropPickedItem`, `toggleDropNames`
  (`showDropNames`). `QuickItemActions.dropPickedItem` asks first for valuable items.
- The loot filter reads `GameOptions.loot*`; ALT held still shows every name.

## Packets
- `ItemsDropped`: items and zen piles coming into view or landing.
- `MoneyDropped`: same bytes as a one-item `ItemsDropped`, handled by the same code.
- `MoneyDroppedExtended`: a zen pile with its amount.
- `ItemDropRemoved`: drops leaving view or picked up.
- `ItemDropResponse`: the hero's drop request; clears the slot or rolls the move back.
- `ItemPickUpRequestFailed`: a red line, except for `ItemStacked`.

## Depends on / used by
- uses: `items` (`ItemSerializer`, `itemDef`, `itemLevelName`), `options` (`GameOptions`), `_shared/net_helpers.ts`
  (`removeNetObject`), `controllers/actors/itemAngle.ts`, `controllers/render`, `controllers/sound`, `Store`.
- used by: `src/app/logic.ts` (net), `inventory/quickItemRules.ts` (`HIGH_DROP_LEVEL`),
  `items/archangelWeapons.test.ts`, ecs `dropMotionSystem` / `objectEffectSystem`,
  `controllers/sound/drops.ts`, `controllers/actors/playerObject.ts` (`archangelWeapon`).
- HUD `world_objects` (names, tier colours, loot filter); window `options` (loot zen slider).

## Change it
- a drop that shows another model at some level: `dropModelProxy.ts` (and `items/itemLevelLook.ts` for its name).
- how a zen pile looks: `zenPile.ts` (count, spread) and `DropObject` (coin height, fall).
- name colours or the "high" level: `dropTier.ts`. Loot filter rules: `lootFilter.ts`.

## Tests
- `dropModelProxy.test.ts`: Box of Kundun / Box of Luck models, medals, chocolate boxes, Rena, quest items.
- `zenPile.test.ts`: coin count by amount, scatter inside the radius and over the disc, same pile per seed.
