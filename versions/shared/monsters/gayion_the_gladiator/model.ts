import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, MonsterObject, monsterModelFile, monsterScaleOf, registerModelClass } from '@/controllers/actors';
import { GAION_SWORDS, heldSwords } from './swords';

// MONSTER_GAYION_THE_GLADIATOR (504): MONSTER_MODEL_GAYION at 1.4 with his five swords
// (GMEmpireGuardian4.cpp:77-104). Not ported: the swords he throws (SubType 1 / 3 flights with their
// blur, shadow and joints, MoveHandlers.cpp:8041+), the sword bones' sprites and mesh 2's blue
// bright pass (ZzzEffect.cpp:9400-9470), the rage inferno on Appear.
const NPC_TYPE = 504;

/** MONSTER_MODEL_GAYION. */
const MODEL_TYPE = 164;

/** Mesh 1 is drawn bright over the sword (ZzzEffect.cpp:9396-9397). */
const BRIGHT_MESH = 1;

export class Gaion extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(NPC_TYPE);
  }

  #swords: ModelObject[] = [];
  #held: readonly boolean[] | null = null;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.load(await loadGLTF(monsterModelFile(MODEL_TYPE), world));
    // Each held sword sits on its body bone in its own key 0 (AnimationTransformWithAttachHighModel_usingGlobalTM).
    for (const { file, bone } of GAION_SWORDS) {
      const sword = new ModelObject(world.scene, this.node);
      sword.NodeNamePrefix = `${file}_`;
      sword.setParent(this);
      sword.setBoneLink(bone);
      sword.SkipBoundingBox = true;
      sword.ClassicShadow = false;
      sword.BlendMesh = BRIGHT_MESH;
      sword.setPartPose({ action: 0, speed: 0 });
      sword.load(await loadGLTF(`Monster/${file}.glb`, world));
      this.#swords.push(sword);
    }
    this.#held = null;
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    const held = heldSwords(this.CurrentAction);
    if (held !== this.#held && this.#swords.length === GAION_SWORDS.length) {
      this.#held = held;
      for (let i = 0; i < this.#swords.length; i++) this.#swords[i].node.setEnabled(held[i]);
    }
    for (const sword of this.#swords) sword.Update(gameTime);
  }
}

registerModelClass(504, Gaion);
