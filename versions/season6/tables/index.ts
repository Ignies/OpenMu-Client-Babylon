/**
 * Season 6 game tables - the ones OpenMU's `VersionSeasonSix` initializer
 * configures. They live in `versions/shared/` and `modules/inventory`; this module is
 * the one door the base game should import them through (a `tables` handle
 * beside `versionPackets` in src/version/index.ts, Phase 7 step b) so a
 * version with different tables replaces them without touching base code.
 *
 * Sources: `items.json` (tools/convertItemTXTtoJson.ts from the S6 Item.txt),
 * `skillsDatabase.ts` (generated from `SkillsInitializer.cs`), the monster folders,
 * `jewelUpgrade.ts` (S6 jewel rules incl. Harmony / refine stones).
 */
export { ItemsDatabase } from '../../shared/items/itemsDatabase';
export { SKILL_DEFINITIONS, skillDefinition } from '../../shared/skills/skillsDatabase';
export type { SkillDefinition } from '../../shared/skills/skillsDatabase';
export { MonstersDatabase } from '../../shared/monsters/monstersDatabase';
export * as jewelRules from '@/modules/inventory/jewelUpgrade';
