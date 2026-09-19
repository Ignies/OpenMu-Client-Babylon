import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter, type Emission } from '../../common/effectParticles';
import { TILE_CM } from '../../common/terrain/consts';
import type { Entity, World } from '../../ecs/world';

/**
 * `float fLumi = ((sinf(WorldTime * 0.001f) + 1.f) * 0.5f) * 100.0f;`
 * (GM_PK_Field.cpp:285) - one map-wide sine, 0 to 100 and back over 6.28 s.
 * Every vent tests the same number against its own window, so the ten sprays
 * are phased against each other but never against a timer of their own.
 */
const SWEEP_RATE = 0.001;

/**
 * ```cpp
 * int nRanDelay = o->Position[0];
 * nRanDelay = nRanDelay % 3 + 1;
 * int nRanTemp = 30 * nRanDelay;
 * int nRanGap  = 10;
 * if (nRanTemp != 90.0f) nRanGap = 40;
 * ```
 * :287-296. The window is chosen by the vent's own world X in MU units,
 * truncated: `x % 3` gives 30/60/90, and only the 90 band is narrow. So the
 * ten vents fall into three groups - `[30, 70]`, `[60, 100]` and `[90, 100]`
 * - and the third one spits only at the top of the sweep, which is what
 * staggers the field instead of making all ten breathe together.
 */
const BAND_STEP = 30;
const WIDE_GAP = 40;
const NARROW_GAP = 10;
const NARROW_BAND = 90;

/**
 * `for (int i = 0; i < 20; ++i) CreateParticleFpsChecked(BITMAP_WATERFALL_2,
 * ..., 6, o->Scale, o)` (:300-303): twenty per 25 Hz reference tick for as
 * long as the window is open.
 *
 * Two knowing cuts. `waterfall5_9` is the port's only falling kind and is
 * `waterFall5`, not `WATERFALL2`; and SubType 6 lives `rand % 50 + 20` ticks
 * (ZzzEffectParticle.cpp:3510-3516) against its 30, so matching the count
 * would hold roughly 150 sprites per open vent where the original holds 900
 * and leans on its own particle cap to survive it. Five per tick keeps the
 * shape of the burst inside a pool of 2048.
 *
 * `o->Scale *= 0.2f` is the SubType's own line; `waterfall5_9` adds rather
 * than multiplies (`scale = 0.6 + scale`), so 0.2 here is the same intent
 * applied to the only knob there is.
 */
const SPRAY: readonly Emission[] = [
  { kinds: ['waterfall5_9'], every: 1, count: 5, scale: 0.2 },
];

/**
 * Vulcanus 0 (GM_PK_Field.cpp:282-306), x10 - the lava spray, hidden by
 * `MoveObject` (:254-262) and emitting only inside its band of the map's
 * shared sine.
 *
 * Effect-only, so no model is loaded and the class is the whole of it; the
 * emitter is left un-ticked outside the window, which `ParticleEmitter`
 * treats as "nothing to spawn" without letting a backlog build (it clamps at
 * four ticks), exactly as Tarkan's timed vents do.
 */
export class VulcanusLavaSprayObject extends MapTileObject {
  #bandStart = BAND_STEP;

  #bandEnd = BAND_STEP + WIDE_GAP;

  #emitter: ParticleEmitter | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    // `o->Position[0]` is the record's X in MU units, truncated by the
    // assignment to `int`; `node.position` is the same value in tiles.
    const muX = Math.trunc(this.node.position.x * TILE_CM);
    const band = BAND_STEP * ((muX % 3) + 1);

    this.#bandStart = band;
    this.#bandEnd = band + (band === NARROW_BAND ? NARROW_GAP : WIDE_GAP);

    this.#emitter = new ParticleEmitter(
      world.scene,
      SPRAY,
      this.node.position,
      this.node.rotation.y,
      this.node.scaling.x
    );
  }

  dispose(): void {
    this.#emitter = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const emitter = this.#emitter;
    if (!emitter) return;

    const elapsedMs = gameTime.TotalGameTime.TotalSeconds * 1000;
    const lumi = (Math.sin(elapsedMs * SWEEP_RATE) + 1) * 0.5 * 100;

    if (lumi >= this.#bandStart && lumi <= this.#bandEnd) emitter.update();
  }
}
