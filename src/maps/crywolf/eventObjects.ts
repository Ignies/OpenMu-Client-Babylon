import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter } from '../../common/effectParticles';
import { Store } from '../../store';
import {
  CrywolfOccupation,
  crywolfHud,
} from '../../events/crywolf';
import type { Entity, World } from '../../ecs/world';

/**
 * The Crywolf event staging (GMCrywolf1st.cpp), driven by the state in
 * `events/crywolf.ts` the way the Blood Castle gate polls its match state.
 * Against stock OpenMU the state never leaves peace, so these render their
 * peace look until a server actually runs the event.
 */

/** `o->Alpha = 0.2f` (MoveCryWolf1stObject :363). */
const DOME_ALPHA = 0.2;
/** `sinf(WorldTime * 0.004f)`: the war heartbeat, in rad/s. */
const PULSE_SPEED = 4;
/** `fTemp`: the beat swells tenfold once the statue is nearly down. */
const PULSE_CRITICAL_HP = 10;
/** `rand_fps_check(3)`: one vent puff about every third tick. */
const VENT_EVERY = 3;

/**
 * Type 81 (×1, over the wolf statue): the altar's energy dome. In peace it
 * is the faint constant shell; during the war the original redraws it
 * additively with a heartbeat that reddens and quickens as the statue HP
 * falls (RenderCryWolf1stObjectMesh :540-561). The clone has no per-object
 * chrome pass, so the beat is carried by the shell's alpha instead.
 */
export class CrywolfDomeObject extends MapTileObject {
  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);
    this.setAlpha(DOME_ALPHA);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    if (!this.Ready || this.OutOfView) return;

    const hud = crywolfHud();
    if (hud.occupation !== CrywolfOccupation.War) {
      if (this.Alpha !== DOME_ALPHA) this.setAlpha(DOME_ALPHA);
      return;
    }

    const hp = Math.min(100, Math.max(0, hud.statueHp));
    const amp = hp <= PULSE_CRITICAL_HP ? 0.35 : 0.1;
    const wave = Math.sin((performance.now() / 1000) * PULSE_SPEED);
    // Brighter as the shield erodes, beating on top.
    const alpha = 0.3 + ((100 - hp) / 100) * 0.3 + wave * amp;
    this.setAlpha(Math.min(0.95, Math.max(DOME_ALPHA, alpha)));
  }
}

/**
 * Types 74 (×4, visible vents) and 84 (×4, hidden vents by the altar):
 * `CreateParticle(BITMAP_SMOKE, …, 21)` only while the fortress is occupied
 * (RenderCryWolf1stObjectVisual :419-425, RenderCryWolf1stObjectMesh
 * :512-519). 84 stays in the map's effect-only list, so no mesh loads.
 */
export class CrywolfVentObject extends MapTileObject {
  #smoke: ParticleEmitter | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);
    this.#smoke = new ParticleEmitter(
      world.scene,
      [{ kinds: ['smoke21'], every: VENT_EVERY }],
      this.node.position,
      this.node.rotation.y,
      this.node.scaling.x
    );
  }

  dispose(): void {
    this.#smoke = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    if (!this.Ready || Store.world === null) return;
    if (crywolfHud().occupation !== CrywolfOccupation.Occupied) return;
    this.#smoke?.update();
  }
}
