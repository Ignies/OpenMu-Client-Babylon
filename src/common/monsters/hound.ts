import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MONSTER_HIDDEN_MESH, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(1, "Hound")]
const NPC_TYPE = 1;

export class Hound extends MonsterObject {
  static {
    // One source of truth for Object.Scale: the Setting_Monster table in
    // monsterModelTable.ts, keyed by NPC type.
    Hound.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  // `c->Object.HiddenMesh = 0` — the Hell Hound variant's kit (:13856).
  HiddenMesh = MONSTER_HIDDEN_MESH[NPC_TYPE] ?? -1;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    super.load(await loadGLTF('Monster/Monster02.glb', world));
  }
}
