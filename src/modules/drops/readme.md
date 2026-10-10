# drops

Items and zen on the ground: the drop packets, the drop entity and model, the name colour tier
and the loot filter for the ALT name overlay.

## Public API
- `Drops` (`state.ts`, through `index.ts`, the door): `showDropNames`, `toggleDropNames()` (ALT),
  `pickupItemRequest(netId)`.
- none for packets. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).
- `DropObject`: the model class of a drop (frozen pose, zen coin pile, the fall). `setPileFall(height)`.
- `dropTier(drop)`, `DROP_TIER_COLOURS`, `HIGH_DROP_LEVEL` (7) moved to `controllers/item_rules`
  (`dropTier.ts`): the drop sound controller reads them, and a controller may not import a module.
- `dropPassesLootFilter(drop)`, `lootZenThreshold(step)`, `LOOT_ZEN_MAX`: which names the latched overlay keeps.

## How it works
- `ItemsDropped` adds one entity per item with `droppedItem`, `modelFactory: DropObject` and a name
  (`RenderItemName`, ZzzInventory.cpp:6714) with +Skill, +Option and +Luck after it, in that order and with no
  option number (ZzzInventory.cpp:6645-6663), and an ancient piece's set name in front (:6632-6643;
  `installNet` starts the set tables loading, since a label is written once). A fresh drop plays its sound (ZzzObject.cpp:5997-6002 / :6198).
- `controllers/item_rules/dropModelProxy.ts` ports `CreateItem`'s per-level model swap (ZzzObject.cpp:6056-6116):
  Box of Luck by level, candy boxes, Rena +1/+2, quest items, Weapon of Archangel, Wizards Ring. The pose
  follows the shown model. It moved there because `actors/playerObject.ts` reads it too.
- The resting pose and height come from `controllers/actors/itemAngle.ts`.
- A drop is drawn with `HideSkin` (no head, skin or hair). A Mistery to Lilium, Faith, Queen or Lucky 65 / 70
  armour or pants also draws mesh 0 with the bitmap `hideSkinTexture` names, the part with its skin cut out
  (ZzzObject.cpp:7706-7729, :7774-7796, :8897-8908), read from `Data/Player/` (`tools/copyData.ts` ships the 20).
  Queen pants' mesh 0 is the tail, so the tail takes the pants bitmap: the original does the same. Some parts
  draw only the meshes `hideSkinMeshes` names (Iris, the Mistery to Lilium helms, Seraphim, the Faith and Queen
  helms, Sylphid Ray, Phoenix Soul, Sacred, Storm Hard, Piercing, the Lucky helms); those still skip skin.
- Zen: `zenPile.ts` ports `RenderZen` (ZzzObject.cpp:6327): coin count from the amount (3 to 12), scattered
  from a 100-value `RandomTable`. Two departures: the pile is 1.5x wider, and the radius uses a square root
  so the coins spread over the disc. `DropObject` draws the coins as thin instances.
- Leaving view (`ItemDropRemoved`) marks the entity `objOutOfScope`, like any object leaving scope.
- Picking up is `Drops.pickupItemRequest`, the names are `Drops.toggleDropNames` (`showDropNames`);
  dropping the carried item is the inventory's `dropPickedItem`. `QuickItemActions.dropPickedItem` asks first for valuable items.
- The loot filter reads `GameOptions.loot*`; ALT held still shows every name.

## Packets
- `ItemsDropped`: items and zen piles coming into view or landing.
- `MoneyDropped`: same bytes as a one-item `ItemsDropped`, handled by the same code.
- `MoneyDroppedExtended`: a zen pile with its amount.
- `ItemDropRemoved`: drops leaving view or picked up.
- `ItemDropResponse`: the hero's drop request; clears the slot or rolls the move back.
- `ItemPickUpRequestFailed`: a red line, except for `ItemStacked`.

## Depends on / used by
- uses: `items` (`ItemSerializer`, `itemDef`, `itemLevelName`), `options` (`GameOptions`), `scope/objects.ts`
  (`removeNetObject`), `controllers/actors/itemAngle.ts`, `controllers/render`, `controllers/sound`, `session` (sending), `inventory` (`Bag`, item moves).
- used by: `src/app/logic.ts` (net), `inventory/quickItemRules.ts` (`HIGH_DROP_LEVEL`),
  `controllers/item_rules/archangelWeapons.test.ts`, ecs `dropMotionSystem` / `objectEffectSystem`,
  `controllers/sound/drops.ts`, `controllers/actors/playerObject.ts` (`archangelWeapon`).
- HUD `world_objects` (names, tier colours, loot filter); window `options` (loot zen slider).

## Change it
- a drop that shows another model at some level: `controllers/item_rules/dropModelProxy.ts` (and `controllers/item_rules/itemLevelLook.ts` for its name).
- how a zen pile looks: `zenPile.ts` (count, spread) and `DropObject` (coin height, fall).
- name colours or the "high" level: `controllers/item_rules/dropTier.ts`. Loot filter rules: `lootFilter.ts`.

## Tests
- `zenPile.test.ts`: coin count by amount, scatter inside the radius and over the disc, same pile per seed.
- `dropObject.test.ts`: a dropped armour / pants with a HideSkin bitmap draws mesh 0 with it, alpha-tested;
  every other part keeps its own textures; the parts that draw only some meshes, with real texture names;
  a drop casts no shadow (`ItemObjectAttribute`, ZzzObject.cpp:5160).
- `net.test.ts`: the ground label marks skill, option and luck in the original order; the Horn of Dinorant knight skill;
  an ancient piece's set name (reads the real set files).
