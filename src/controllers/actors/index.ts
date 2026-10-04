// Public API of the actors controller: code outside this folder imports from here.
export { BUDGE_DRAGON_MODEL } from './genericMonster';
export { heldWeapons, shownGear, wearsChaosCastleSkin, type Gear } from './chaosCastleUnit';
export { registerModelClass } from './modelClasses';
export { monsterHiddenMesh, monsterModelFile, monsterModelTypeOfNpc, monsterScaleOf } from './monsterModelTable';
export { MonsterObject } from './monsterObject';
export { PlayerObject } from './playerObject';
export { GROUP_AXE, GROUP_BOW, GROUP_SHIELD, GROUP_SPEAR, GROUP_SWORD } from './weaponClass';

// ---- NPCs: model resolution, the NPC tables (views of the monster folders), and what NPC classes extend ----
export { ModelObject, isKnownObjectType, npcSpawnScale, resolveModelFactory } from './modelFactoryPerId';
export { NPC_MODEL_TABLE, TRAP_MODEL_TABLE, npcModelFile } from './npcModelTable';
export { GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE } from './playerNpcTables';
export { WINGS_OF_SPIRITS, WING_GROUP } from './wings';
