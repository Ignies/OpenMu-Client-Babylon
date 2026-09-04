/**
 * 0.97d game tables. Still the Season 6 tables: nothing in the base game
 * imports through this door yet (Phase 7 step c moves it), and the 0.97d
 * sources are not all in reach - the client ships no `Item.txt`, only the
 * compiled `Local/Item.bmd`.
 *
 * What each one should become:
 * - items:    0.97d `Item.txt` through `tools/convertItemTXTtoJson.ts`, or a
 *             decode of the client's `Local/Item.bmd`; OpenMU's item numbers
 *             come from `Version095d/Items/*` plus `Version097d/Items/Jewels.cs`
 *             (Jewel of Creation, group 14 number 22).
 * - skills:   `Version095d/SkillsInitializer.cs` (no master skills).
 * - monsters: `Version095d/Maps/*.cs` (Lorencia, Devias, Noria, Icarus,
 *             Tarkan, Devil Square 1-4).
 * - jewels:   Bless / Soul / Chaos / Life / Creation only - no Harmony, no
 *             refine stones.
 */
export { ItemsDatabase } from '../../../src/common/itemsDatabase';
export { SKILL_DEFINITIONS, skillDefinition } from '../../../src/common/skillsDatabase';
export type { SkillDefinition } from '../../../src/common/skillsDatabase';
export { MonstersDatabase } from '../../../src/common/monstersDatabase';
export * as jewelRules from '../../../src/common/jewelUpgrade';
