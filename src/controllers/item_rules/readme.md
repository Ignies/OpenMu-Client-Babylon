# item_rules

Item rules as the original client computes them: the 12-byte wire format, the normalised item
record, stats, requirements, zen values, level names, the compare tooltip, worn slots, the drop
name tier and the skill an orb or scroll teaches. Pure functions with no state and no packets.

The items controller (`controllers/items`) is the item table itself (`ItemRecord`, `defineItem`,
`ItemRegistry`): pure data the Bun servers load too, imported by every item file. These rules read
that table through `@versions/shared/items/itemsDatabase` and pull in the client (i18n, the
settings), so they cannot sit behind that door: the item files and the servers would load them and
the table would import itself.

## Public API
- `ItemSerializer.DeserializeItem(bytes)` / `SerializeItem(target, item)`, `NeededSpace`: the 12-byte item.
- `itemDef(group, num)`: the normalised item record (cached), or null.
- `ItemGroup`, `isWeapon`, `isShield`, `isWing`, `isJewel`, `isRing`, `isPendant`, `isStaff`, ... : item kinds.
- `itemStats(item)`: damage, defence, durability and requirements for one item. `calcMaxDurability`.
- `HeroStats`, `classOf(charClass)`, `classCanUse(def, hero)`, `classUnrestricted(def)`: who may use an item.
- `itemValue(item, goldType)`, `repairCost`, `repairAllCost`, `isSellingBanned`, `isRepairBanned`,
  `needsRepair`, `withTax`: zen for the shop and repair windows.
- `itemLevelLook(group, num, lvl)`, `itemLevelName(...)`: items shown as another item at one level.
- `comparedItem(item, worn, hero)`, `compareTooltipsOn(shift)`, `CompareTooltips`,
  `COMPARE_TOOLTIP_LABEL_KEYS`, `COMPARE_TOOLTIP_MAX`: the second tooltip.
- `equipSlots(item)` (inner), `isEquipable(slot, item)`, `equipDestination(item, worn)`: worn slots.
- `dropTier(drop)`, `HIGH_DROP_LEVEL`: a drop's glow tier. `dropLabel(drop)` (`dropLabel.ts`): its ground name's colour,
  bold face and set box, as `BuildGroundItemLabelDescriptor` draws it (ZzzInventory.cpp:6280-6663): the white,
  yellow and orange item sets, jewels, the models some levels show, then level and option tints.
- `learnableSkill(item)` (`skillItems.ts`, with `learnableSkillNumber`): the skill an orb, scroll or
  crystal teaches.
- `dropModelProxy(group, num, lvl)`, `archangelWeapon(level)` (`dropModelProxy.ts`, was `modules/drops`):
  the model a drop is shown as (`CreateItem`, ZzzObject.cpp:6056-6116), and the Divine weapon a Weapon of
  Archangel is drawn as; `actors/playerObject.ts` reads the second.
- `goldColor(amount)`: the colour of a zen amount (`getGoldColor`, ZzzInventory.cpp:1094-1110).
- `ancientSetOf(item)`, `wornSetPieces(set, worn, hero)`, `setOptionLines(set, pieces)`, `activeSetOptions(worn, hero)`, `SetOptionLine`,
  `wornStatBonus(worn)`, `withWornStats(hero, worn)`, `WornStats` (`ancientSets.ts`): an ancient piece's set, which of
  its options the worn pieces light, and the stats they add for the requirement checks
  (`CSItemOption`, from `assets/mu/itemSetFile.ts`).
- `isSocketItem(group, num)`, `hasGuardianOption(item)`, `harmonyOf(item)`, `socketsOf(item)`, `socketBonusOf(item)`
  (`itemOptions.ts`): the 380 flag (byte 5 bit 3, read from `raw`), the harmony option or socket bonus
  (byte 6) and the socket seeds (byte % 50, sphere level byte / 50 + 1), as `CreateItem` reads them.
  `harmonyKindOf(group)`, `harmonyBonus(item, tables)`, `harmonyNeedCut(item, tables)`: the harmony option's value once
  the item's level reaches the option's, and the strength / agility it takes off the needs (`GetStrengthenCapability`).
- `socketOptionValue(type, value, maxima)`, `socketStatusBonus(worn, maxima)`, `SocketMaxima`, `SocketStatusBonus`
  (`socketBonus.ts`): one socket value (`CalcSocketOptionValue`) and what every worn seed and mix bonus adds to the
  character window (`CalcSocketStatusBonus`, SocketSystem.cpp:476-570), by the option's `SOPT_*` / `SBOPT_*` id.
- `isOptionWing(group, num)`, `wingOptionKind(item)`, `wingOptions(item)` (`wingOptions.ts`): the wing options
  (`CalcWingOptions`) and the kind of a wing's additional option (`OptionType`, ZzzInfomation.cpp:1236-1442).
- `skillMana(num)`: a skill's mana, for tooltip lines that name it.
- `hasSpecial(item, def)` (`itemSpecials.ts`): `SpecialNum > 0` after `SetItemAttributes` (any skill, luck,
  option or excellent line, by the item kinds that take each), which turns a name blue; `optionSpecials`
  is what the option level adds, by kind.
- `isPackedJewel(group, num)`, `stackCount(item)` (`packedJewels.ts`): the ten packed jewels and the number every item
  grid draws on a square (`RenderNumberOfItem`, NewUIInventoryCtrl.cpp:1531-1583): a pack's (level + 1) * 10 jewels
  (`CalcCompiledCount`), or the pieces of the potions that list names.

## How it works
- `itemSerializer.ts` reads level, luck, skill, option level, excellent, ancient and socket bytes. On wings
  and capes the excellent byte holds the wing options (bits 0-3) and `OptionType` (bits 4-5), and the Horn
  of Fenrir keeps its variant there: neither counts as excellent. Dark Horse
  and Dark Raven keep their level in byte 2, not in the level bits. `raw` keeps the original bytes.
  A socket item's byte 6 is its bonus option even at 0 (OpenMU sends 0xFF for none, and option 0 is the
  physical weapons' damage bonus); other items keep it only when it is not 0.
- `ancientSets.ts` ports `CheckItemSetOptions` / `calcSetOptionList` (CSItemOption.cpp:316-372, :839-906):
  a set lists options only with two pieces worn, one standard option per piece past the first, the
  full-set ones once complete. The worn items are checked against the hero's stats plus `wornStatBonus`
  (`AddStrength` and the rest, `getAllAddState` :666-740): each piece's ancient +5 / +10 and the strength to
  charisma set options of a durability-only first count. MuMain compares the relative option number against
  the absolute enum in `AddStatsBySetOptions`, so it never adds them; the intended relative 0-4 is ported. The
  socket stats are left out: the last `CheckItemSetOptions` overwrites them (:834). `ItemDef.attType` is Item.bmd's `AttType` (the item files'
  `Type`), the stat an ancient piece's bonus raises.
- `itemStats.ts` ports `CalcDamageMin/Max`, `CalcMagicPower`, `CalcDefense`, `CalcRequirements`
  (`ZzzInfomation.cpp`) and `CalcMaxDurability` (ZzzInventory.cpp:1549) over `itemDef`, which hides the
  per-group column names of the item files (`Strength`/`Str`, `Durability`/`Dur`, ...).
- `itemValue.ts` ports `ItemValue` (ZzzInfomation.cpp:1457), `CalcRepairCost` (ZzzInventory.cpp:1201) and
  `IsSellingBan` / `IsRepairBan` (ZzzInventory.cpp:7812/7887). The server has the final say on prices. A sale
  loses the repair share of anything but `ItemValue`'s `goto EXIT_CALCULATE` items (`keepsSellPrice`), and
  `IsRepairBan` is its own list: no item kind is guessed from durability.
- Strength requirements follow OpenMU (four per option level), not the original's `Option3 * 5`.
- `itemLevelLook.ts`: Box of Luck by level, Box of Kundun, Weapon of Archangel, Scroll of the Emperor +1 and
  Broken Sword +1 get their own name and icon (`GetItemName`, ZzzInventory.cpp:1418-1445, 1593-1609).
  The ground model for the same items is `dropModelProxy.ts`.
- `itemCompare.ts`: the worn item of the same item group in a slot the hovered item could take
  (`equipSlots.ts`), gated by `GameOptions.compareTooltips`.
- `skillItems.ts`: the item -> skill table (OpenMU `Orbs.cs` / `Scrolls.cs`). Why the hero cannot learn
  it (`learnSkillError`) is gameplay text and stays in `modules/skills/skillItems.ts`.
- Dependency direction: these files were `modules/items` (plus `skills/skillItems.ts`,
  `inventory/equipSlots.ts`, `drops/dropTier.ts`); the tooltip, icon, sound and asset controllers
  read them, and a controller may not import a module. The pure constants they share with the
  servers went lower still: `InventoryConstants` to `core/inventoryConstants.ts`, the pet item
  numbers to `versions/shared/items/petItems.ts`.

## Depends on / used by
- uses: `@versions/shared/items/itemsDatabase` and `petItems.ts`, `@versions/shared/skills/skillsDatabase`,
  `core` (`binaryUtils`, `inventoryConstants`), `settings` (`GameOptions`), `src/i18n`.
- used by: every net that reads item bytes (`inventory`, `drops`, `npc_shop`, `trade`, `chaos_mix`,
  `personal_shop`, `scope`, `quests`, `chat/chatItemLinks.ts`), `inventory` and `npc_shop` (prices, repair, requirements),
  `inventory`, `drops`, `mu_helper`, `events`, `skills`, controllers (`interface/itemTooltip.ts`,
  `components/item_tooltip`, `components/item_icon`, `assets/itemIconPack.ts`, `sound/drops.ts`).
- windows: `inventory`, `vault`, `trade`, `npc_shop` (`goldColor`, `itemValue`), `economy_prompts`, `options`,
  `events/goldenArcherWindow.tsx`.

## Change it
- a new item flag on the wire: `itemSerializer.ts` (both directions) and the `Item` type in `src/ecs/world.ts`.
- a stat or requirement formula: `itemStats.ts`. A price or repair cost: `itemValue.ts`.
- an item that looks like another at some level: `LEVEL_LOOKS` in `itemLevelLook.ts`, and
  `dropModelProxy.ts` for the ground model.
- what the compare tooltip measures against: `comparedItem` in `itemCompare.ts`.

## Tests
- `itemSerializer.test.ts`: round trips (plain, +13 luck skill, excellent, ancient, sockets, pets, number > 255),
  a socket bonus of 0;
  wing options and kind, the Fenrir variant.
- `itemClasses.test.ts`: the Rage Fighter class column and unrestricted items; every row's class block
  against `Data/Local/Eng/item_eng.bmd`'s.
- `itemRequirements.test.ts`: strength per option level, wing and pet level requirements.
- `itemCompare.test.ts`: which worn item is compared, and the green / red deltas on the tooltip.
- `itemLevelLook.test.ts`: Box of Luck / Box of Kundun names and icons.
- `dropModelProxy.test.ts`: Box of Kundun / Box of Luck models, medals, chocolate boxes, Rena, quest items, Ale, Life Stone, Loch's Feather, Wizards Ring.
- `archangelWeapons.test.ts`: Divine weapon and Weapon of Archangel names, colours and icons.
- `portedItems.test.ts`: MuMain items and capes (tests `controllers/actors/wings.ts`, appearance).
- `ancientSets.test.ts`: set lookup by discriminator, worn piece count, which options light, the stats worn items add.
- `repair.test.ts`: `IsRepairBan` (every wing repaired; orbs, chaos, arrows, old pets, event helpers not), a worn
  Wings of Despair's repair price, the repair share off a worn item's sale but for `ItemValue`'s exceptions.
- `wingTiers.test.ts`: the Wing of Curse a first wing, the Wings of Despair a second one (tooltip, defense), and
  `ItemValue`'s wing scale (every wing to 12/6, 12/36-43, 12/50).
- `dropLabel.test.ts`: ground name colours by level and option, the item sets, jewels, level models, sets.
- `bundlesAndParchments.test.ts`: the packed jewels 12/136-143 and the Rage Fighter parchments 15/30-36 exist,
  with Item.bmd's names, the original's models and the skills the parchments teach.
- `packedJewels.test.ts`: the pack count by level and which potions show their pieces.
- `questItemLink.test.ts`: the Blood Castle weapon on the back (tests `controllers/actors/weaponAttachment.ts`).
- `weaponAttack.test.ts`: attack clip choice per weapon (tests `controllers/actors/weaponClass.ts`).
- `versions/shared/items/items.golden.test.ts` covers the item table these rules read.
