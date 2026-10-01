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
 * Keep the export names: the base imports the version's tables by these names.
 */
export { ItemsDatabase } from '../../shared/items/itemsDatabase';
export { SKILL_DEFINITIONS, skillDefinition } from '../../shared/skills/skillsDatabase';
export type { SkillDefinition } from '../../shared/skills/skillsDatabase';
export { MonstersDatabase } from '../../shared/monsters/monstersDatabase';
export * as jewelRules from '../../../src/features/inventory/jewelUpgrade';
