/**
 * Season 6 game tables — the ones OpenMU's `VersionSeasonSix` initializer
 * configures. Today they are the files under `src/common/`; this module is
 * the one door the base game should import them through (a `tables` handle
 * beside `versionPackets` in src/version/index.ts, Phase 7 step b) so a
 * version with different tables replaces them without touching base code.
 *
 * Sources: `items.json` (tools/convertItemTXTtoJson.ts from the S6 Item.txt),
 * `skillsDatabase.ts` (generated from `SkillsInitializer.cs`), `monsters.json`,
 * `jewelUpgrade.ts` (S6 jewel rules incl. Harmony / refine stones).
 */
export { ItemsDatabase } from '../../../src/common/itemsDatabase';
export { SKILL_DEFINITIONS, skillDefinition } from '../../../src/common/skillsDatabase';
export type { SkillDefinition } from '../../../src/common/skillsDatabase';
export { MonstersDatabase } from '../../../src/common/monstersDatabase';
export * as jewelRules from '../../../src/common/jewelUpgrade';
