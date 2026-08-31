/**
 * TODO: this version's game tables. The Season 6 tables are re-exported so
 * the folder compiles; replace each line with a table converted from the
 * version's client files / OpenMU initializer:
 *
 * - items:    `bun run tools/convertItemTXTtoJson.ts` on that version's `Item.txt`
 *             -> `tables/items.json`, wrapped in an `ItemsDatabase`-shaped class
 * - skills:   regenerate `SKILL_DEFINITIONS` from
 *             `OpenMU/src/Persistence/Initialization/<ver>/SkillsInitializer.cs`
 * - monsters: `<ver>/Monsters/*.cs` -> `monsters.json`
 * - jewels:   the jewel rules that exist in that version (`jewelUpgrade.ts` shape)
 * - NPC ids / shops / gates: `<ver>/Maps/*.cs`, that version's `gate.bmd`
 *
 * Keep the export names: the base imports `@version/tables` by these names.
 */
export { ItemsDatabase } from '../../../src/common/itemsDatabase';
export { SKILL_DEFINITIONS, skillDefinition } from '../../../src/common/skillsDatabase';
export type { SkillDefinition } from '../../../src/common/skillsDatabase';
export { MonstersDatabase } from '../../../src/common/monstersDatabase';
export * as jewelRules from '../../../src/common/jewelUpgrade';
