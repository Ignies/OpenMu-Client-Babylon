import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, MonsterObject, monsterModelFile, monsterScaleOf, registerModelClass } from '@/controllers/actors';
import { bonePos } from '@/controllers/fx';
import type { HeldSprites } from '@/controllers/fx/effectParticles';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { sideFlight, stormFlight, type Vec } from './flights';
import { GAION_SWORDS, THROWS, heldSwords } from './swords';
import { ThrownSwords, dressSword, spriteLook } from './thrown';

// MONSTER_GAYION_THE_GLADIATOR (504): MONSTER_MODEL_GAYION at 1.4 with his five swords
// (GMEmpireGuardian4.cpp:77-104), drawn and thrown as ZzzEffect.cpp / MoveHandlers.cpp do (thrown.ts).
// What is not ported is listed in this folder's readme row.
const NPC_TYPE = 504;

/** MONSTER_MODEL_GAYION. */
const MODEL_TYPE = 164;

/** Mesh 1 is drawn bright over the sword (ZzzEffect.cpp:9396-9397). */
const BRIGHT_MESH = 1;

/** One 25 Hz tick: MoveMonsterVisual throws once a tick while the clip is in its window. */
const TICK = 1 / 25;
/** Ticks one frame may pay out after a hitch. */
const MAX_TICKS = 4;

const DEG = Math.PI / 180;
const tmp = new Vector3();

/** A position in tiles, relative to the map, as the original's cm with z up. */
const mu = (x: number, height: number, z: number): Vec => [x * 100, z * 100, height * 100];

export class Gaion extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(NPC_TYPE);
  }

  #world: World | null = null;
  #entity: Entity | null = null;
  #swords: ModelObject[] = [];
  #sprites: (HeldSprites | null)[] = [];
  #held: readonly boolean[] | null = null;
  #thrown: ThrownSwords | null = null;
  #nextTick = -1;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.#world = world;
    this.#entity = entity;
    this.load(await loadGLTF(monsterModelFile(MODEL_TYPE), world));
    // Each held sword sits on its body bone in its own key 0 (AnimationTransformWithAttachHighModel_usingGlobalTM).
    for (const [i, { file, bone }] of GAION_SWORDS.entries()) {
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
      this.#sprites.push(dressSword(sword, i, true));
    }
    this.#held = null;
    this.#thrown = new ThrownSwords(world, world.mapParent, Gaion.OverrideScale);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    const held = heldSwords(this.CurrentAction);
    if (held !== this.#held && this.#swords.length === GAION_SWORDS.length) {
      this.#held = held;
      for (let i = 0; i < this.#swords.length; i++) this.#swords[i].node.setEnabled(held[i]);
    }
    const shown = !this.OutOfView && this.Alpha > 0;
    for (let i = 0; i < this.#swords.length; i++) {
      this.#swords[i].Update(gameTime);
      this.#sprites[i]?.update(shown && held[i], spriteLook);
    }

    const now = gameTime.TotalGameTime.TotalSeconds;
    if (this.#nextTick < 0 || now - this.#nextTick > MAX_TICKS * TICK) this.#nextTick = now;
    while (now >= this.#nextTick) {
      this.#nextTick += TICK;
      this.#throwTick(now);
    }
    this.#thrown?.update(gameTime);
  }

  dispose(): void {
    for (const sprites of this.#sprites) sprites?.dispose();
    this.#sprites = [];
    this.#thrown?.dispose();
    this.#thrown = null;
    super.dispose();
  }

  /**
   * MoveMonsterVisual (GMEmpireGuardian4.cpp:301-415): while the attack's key is below its window, each tick
   * throws its swords from their body bones at the hero (ReceiveAction aims every swing at `HeroIndex`).
   */
  #throwTick(now: number): void {
    const world = this.#world;
    const entity = this.#entity;
    const thrown = this.#thrown;
    const rule = THROWS[this.CurrentAction];
    if (!rule || !world || !entity?.transform || entity.dying || !thrown || !this.Ready) return;
    if (this.actionFrame() >= rule.until) return;
    const hero = world.playerEntity?.transform;
    if (!hero) return;

    const origin = world.mapParent.position;
    const own = entity.transform.pos;
    const target = mu(hero.pos.x, hero.pos.y, hero.pos.z);
    const owner = mu(own.x, own.y, own.z);
    const head: Vec = [0, 0, -this.node.rotation.y / DEG];
    for (const sword of rule.swords) {
      bonePos(entity, GAION_SWORDS[sword].bone, tmp).subtractInPlace(origin);
      const start = mu(tmp.x, tmp.y, tmp.z);
      // The terrain height at the target is the hero's own.
      const flight = rule.sub === 1
        ? sideFlight(sword, start, target, owner, head)
        : stormFlight(sword, start, target, target[2], head, Math.random);
      thrown.throw(sword, flight, now);
    }
  }
}

registerModelClass(504, Gaion);
