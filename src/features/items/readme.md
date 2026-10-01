# items

Item rules as the original client computes them: the 12-byte wire format, the normalised
`items.json` row, stats, requirements, zen values, level names and the tooltip compare. Pure
functions with no state and no packets.

## Public API
- `ItemSerializer.DeserializeItem(bytes)` / `SerializeItem(target, item)`, `NeededSpace`: the 12-byte item.
- `itemDef(group, num)`: the normalised `items.json` row (cached), or null.
- `ItemGroup`, `isWeapon`, `isShield`, `isWing`, `isJewel`, `isRing`, `isPendant`, `isStaff`, ... : item kinds.
- `itemStats(item)`: damage, defence, durability and requirements for one item. `calcMaxDurability`.
- `HeroStats`, `classOf(charClass)`, `classCanUse(def, hero)`, `classUnrestricted(def)`: who may use an item.
- `itemValue(item, goldType)`, `repairCost`, `repairAllCost`, `isSellingBanned`, `isRepairBanned`,
  `needsRepair`, `withTax`: zen for the shop and repair windows.
- `itemLevelLook(group, num, lvl)`, `itemLevelName(...)`: items shown as another item at one level.
- `comparedItem(item, worn, hero)`, `compareTooltipsOn(shift)`, `CompareTooltips`,
  `COMPARE_TOOLTIP_LABEL_KEYS`, `COMPARE_TOOLTIP_MAX`: the second tooltip.
- `goldColor(amount)`: the colour of a zen amount (`getGoldColor`, ZzzInventory.cpp:1094-1110).

## How it works
- `itemSerializer.ts` reads level, luck, skill, option level, excellent, ancient and socket bytes. Dark Horse
  and Dark Raven keep their level in byte 2, not in the level bits. `raw` keeps the original bytes.
- `itemStats.ts` ports `CalcDamageMin/Max`, `CalcMagicPower`, `CalcDefense`, `CalcRequirements`
  (`ZzzInfomation.cpp`) and `CalcMaxDurability` (ZzzInventory.cpp:1549) over `itemDef`, which hides the
  per-group column names of `items.json` (`Strength`/`Str`, `Durability`/`Dur`, ...).
- `itemValue.ts` ports `ItemValue` (ZzzInfomation.cpp:1457), `CalcRepairCost` (ZzzInventory.cpp:1201) and
  `IsSellingBan` / `IsRepairBan` (ZzzInventory.cpp:7812/7887). The server has the final say on prices.
- Strength requirements follow OpenMU (four per option level), not the original's `Option3 * 5`.
- `itemLevelLook.ts`: Box of Luck by level, Box of Kundun, Weapon of Archangel, Scroll of the Emperor +1 and
  Broken Sword +1 get their own name and icon (`GetItemName`, ZzzInventory.cpp:1418-1445, 1593-1609).
  The ground model for the same items is `drops/dropModelProxy.ts`.
- `itemCompare.ts`: the worn item of the same item group in a slot the hovered item could take
  (`inventory/equipSlots.ts`), gated by `GameOptions.compareTooltips`.

## Depends on / used by
- uses: `@versions/shared/items/itemsDatabase`, `inventory/equipSlots.ts`, `options` (`GameOptions`),
  `skills/skillItems.ts`, `pets/petConstants.ts`, `src/i18n`.
- used by: every net that reads item bytes (`inventory`, `drops`, `npc_shop`, `trade`, `chaos_mix`,
  `personal_shop`, `scope`, `quests`, `chat/chatItemLinks.ts`), `Store` (prices, repair, requirements),
  `inventory`, `drops`, `mu_helper`, `events`, `skills`, controllers (`interface/itemTooltip.ts`,
  `components/item_tooltip`, `components/item_icon`, `assets/itemIconPack.ts`, `sound/drops.ts`).
- windows: `inventory`, `vault`, `trade`, `npc_shop` (`goldColor`, `itemValue`), `economy_prompts`, `options`,
  `events/goldenArcherWindow.tsx`.

## Change it
- a new item flag on the wire: `itemSerializer.ts` (both directions) and the `Item` type in `src/ecs/world.ts`.
- a stat or requirement formula: `itemStats.ts`. A price or repair cost: `itemValue.ts`.
- an item that looks like another at some level: `LEVEL_LOOKS` in `itemLevelLook.ts`, and
  `drops/dropModelProxy.ts` for the ground model.
- what the compare tooltip measures against: `comparedItem` in `itemCompare.ts`.

## Tests
- `itemSerializer.test.ts`: round trips (plain, +13 luck skill, excellent, ancient, sockets, pets, number > 255).
- `itemClasses.test.ts`: the Rage Fighter class column and unrestricted items.
- `itemRequirements.test.ts`: strength per option level, wing and pet level requirements.
- `itemCompare.test.ts`: which worn item is compared, and the green / red deltas on the tooltip.
- `itemLevelLook.test.ts`: Box of Luck / Box of Kundun names and icons.
- `archangelWeapons.test.ts`: Divine weapon and Weapon of Archangel names, colours and icons.
- `portedItems.test.ts`: MuMain items and capes (tests `controllers/actors/wings.ts`, appearance).
- `questItemLink.test.ts`: the Blood Castle weapon on the back (tests `controllers/actors/weaponAttachment.ts`).
- `weaponAttack.test.ts`: attack clip choice per weapon (tests `controllers/actors/weaponClass.ts`).
