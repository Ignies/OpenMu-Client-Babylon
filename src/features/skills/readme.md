# skills

The hero's skill bookkeeping the server does not send (buff timers, re-use delays, castability,
master level and tree), the skill packet handlers, and the casting rules the cast system and the
hotbar share.

## Public API
- `skills` (`index.ts`): the facade. `update(map, dt)` / `reset()` step every layer. Readers `activeBuffs`,
  `hasBuff`, `buffRemaining`, `cooldown`, `usability`, `requirementsMet`, `canUse`, master ones
  (`masterLevel`, `masterExpPercent`, `masterTree`, `masterLearnBlock`, ...). Commands
  `startCooldown(num)`, `loadMasterTree()`, `learnMasterSkill(num)`.
- `skillCasting.ts`: `TELEPORT`, `TELEPORT_ALLY`, `isTeleportSkill`, `isAreaSkill`, `isSelfCastable`,
  `chooseSkillAction`, `advancesSwordCount`, `rotationByte256`, `isHotbarSkill`, `skillIconCell`.
- `cooldowns.ts`: `skillCooldowns`, `onCooldownTick(listener)`, `skillDelaySeconds(num)`.
  `recipes.ts`: `SKILL_DELAY_MS`, `buffIconCell(effectId)`. `masterTree.ts`: `MASTER_TEXT`,
  `formatMasterText`, `masterSkillIconCell`. `masterLevel.ts`: `MASTER_EXP_SUB_BARS`.
- `masterBase(skill)` (`skillAliases.ts`), `learnableSkill(item)` / `learnSkillError(...)` (`skillItems.ts`),
  `skillDisplayName(number)` (`skillNames.ts`), `playTeleportAnimation(...)` (`net.ts`).

## How it works
- Layers: `layer.ts` is the `SkillLayer` contract (`name`, optional `maps`, `update`, `reset`).
  `layers.ts` holds `SKILL_LAYERS`, the only list, in update order: buffs, cooldowns, usability (reads
  cooldowns), masterLevel, masterTree (reads both). `index.ts` wraps them in `skills`:
  `src/ecs/systems/skillSystem.ts` calls `update` once a frame, `src/app/lifecycle.ts` calls `reset`
  on a map change. `_template.ts` is a copy-me file, never imported.
- The skill list, buffs and hot keys live in the Store: `Store.skills`, `setSkillList`, `addSkill`,
  `removeSkill`, `currentSkill`, `buffs`, `setBuff`, `skillHotkeys`, `assignSkillHotkey`, `learnSkillItem`.
- Casts go out from `src/ecs/systems/skillCastSystem.ts` (TargetedSkill / AreaSkill), which asks
  `skills.canUse` and calls `skills.startCooldown`.
- `masterLevel.ts` and `masterTree.ts` register their own `EventBus.on` handlers when the facade is
  imported, not through `src/app/logic.ts`.

## Packets
- `SkillListUpdate`, `SkillAdded`, `SkillRemoved` (F3 11): one handler; the count byte (0xFE add,
  0xFF remove) picks the shape, then `Store.setSkillList` / `addSkill` / `removeSkill`.
- `MagicEffectStatus`: sets an effect on the object; the hero's also goes to `Store.setBuff`.
- `MagicEffectCancelled`: maps the skill to its effect (`SKILL_TO_EFFECT`, `magicEffects.ts`) and clears it.
- `AreaSkillAnimation`: turns the caster, plays the cast clip and the area visual.
- `ChainLightningHitInfo`: draws the hops caster -> target -> target (`WSclient.cpp:5577-5629`).
- `MasterStatsUpdate`, `MasterCharacterLevelUpdate(Extended)`, `ExperienceGained(Extended)`: master level,
  exp and points (`masterLevel.ts`).
- `MasterSkillList`, `MasterSkillLevelUpdate`: learned master levels (`masterTree.ts`). Out: `AddMasterSkillPoint`.

## Depends on / used by
- uses: `src/app/store.ts`, `_shared/net_helpers.ts`, `hero/characterStats.ts`, `items/itemStats.ts`,
  `@versions/shared/skills/skillsDatabase` and `skillVisuals`, `ecs/systems/teleportSystem.ts`,
  controllers `combat`, `actors`, `assets/mu`, `terrain`, `src/i18n`.
- used by: `src/app` (logic, lifecycle, store), ECS `skillSystem`, `skillCastSystem`, `pointerInputSystem`;
  `combat/net.ts`, `warp/net.ts`, `options/mobileSkillSlots.ts`, `events/devilSquare.ts`; controllers
  `skills`, `combat`, `lighting`, `sound`, `interface`. Windows `versions/shared/ui/windows/skills/`,
  `master_skills/`, `party/`, `mu_helper/`; HUD `bottom_bar/`, `buff_bar/`, `mobile_controls/`.

## Change it
- add a layer: copy `_template.ts` to `<name>.ts`. Keep its three parts: constants in real units with a
  why; state plus plain readers (`fooRemaining()`) and verb commands (`startFoo()`); the `SkillLayer`
  at the bottom. `name` equals the file name. Add it to `SKILL_LAYERS` after any layer it reads, add
  facade readers in `index.ts`. `update` must not allocate. Drawing goes in `versions/shared/ui/`.
- a skill's re-use delay: `delayMs` in `versions/shared/skills/<class>/<skill>/index.ts`.
- buff names, kinds, durations: `NAMES`, `DEBUFF_IDS`, `DURATIONS` in `recipes.ts`.
- castability: `usability.ts`. Cast clip: `chooseSkillAction`. Orb / scroll skills: `skillItems.ts`.

## Tests
- none in this folder. `versions/shared/skills/skillTables.golden.test.ts` snapshots `SKILL_DELAY_MS`.

## Notes
### cooldowns.ts
The server is authoritative; this is display plus the gate the cast system asks. Two clocks:
`skillCooldowns` is observable but changes only when a delay starts or ends; the seconds left are a
plain map pushed to `onCooldownTick` once a frame, which the hotbar paints into its sweep
(`RenderSkillDelay`) through a ref. Writing the observable per frame re-rendered the hotbar at frame rate.
### masterLevel.ts
`Master_Level_Data` (`nMLevel`, `lMasterLevel_Experince`, `lNext_MasterLevel_Experince`, `nMLevelUpMPoint`).
Fed by `MasterStatsUpdate` (F3 50, on entering the game), `MasterCharacterLevelUpdate` (F3 51),
`ExperienceGained` (C3 16, only in master progression) and `MasterSkillLevelUpdate`'s points (via `masterTree.ts`).
### masterTree.ts
`ensureMasterTreeData` loads once, under `Data/`: `Local/MasterSkillTreeData.bmd` (512 BUX records of 24
bytes, `_MASTER_SKILLTREE_DATA`, plus a 4-byte `GenerateCheckSum2` trailer), `Local/<lang>/MasterSkillTooltip_<lang>.bmd`
(512 records of 616 bytes, seven printf strings) and `Local/Skill.bmd` (600 records of 80 bytes; icon,
use type, base skill). A wrong path returns the SPA fallback page, not a 404, hence the range checks.
### recipes.ts
OpenMU's `MagicEffectNumber` is the original's `eBuffState` (`_enum.h`), the record index of
`Data/Local/BuffEffect.bmd` (`w_BuffScriptLoader.cpp`) and the icon index of `newui_statusicon*.jpg`.
`kind` is `s_BuffClassType`. Names: language pack (`buffNameFile.ts`), then catalogue, then enum name.
Delays are `Skill.bmd` `Delay` (offset 44, ms); `SKILL_DELAY_MS` starts empty, `registerSkills` fills it.
### usability.ts
`skillRequirementsMet` is the static rule (class, level, energy, weapon) that greys the icon
(`bCantSkill`); `canUseSkill` adds mana, AG, the running delay and the safe zone. Pure readers over
MobX state: no `update`, no `reset`.
