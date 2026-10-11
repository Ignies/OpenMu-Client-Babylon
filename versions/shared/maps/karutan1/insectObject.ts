import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { REFERENCE_FPS } from '@/controllers/anim/playSpeed';
import { createMovableFlare, type MovableFlare } from '@/controllers/lighting/effectLights';
import { Vector3, type TransformNode } from '@/controllers/render/babylon/exports';
import type { Entity, World } from '@/ecs/world';
import { findBone } from '../bloodcastle/bones';

/**
 * `Models[66].Actions[0].PlaySpeed = Models[66].Actions[1].PlaySpeed = 0.15f`
 * (MapManager.cpp:1167-1168). Karutan is one of three worlds where
 * `RenderObject` takes the action's `PlaySpeed` in place of `o->Velocity`
 * (ZzzObject.cpp:3696-3701, types 66 and 107), so 0.15 is the rate both
 * clips actually run at - the default would be 0.16.
 */
const INSECT_PLAY_SPEED = 0.15;

/** `o->AnimationFrame >= 19` (GMKarutan1.cpp:183); both clips are 20 keys. */
const TAIL_FRAME = 19;

/** `rand_fps_check(10)`: one reference tick in ten (ZzzAI.cpp:711-714). */
const SWITCH_ODDS = 0.1;

/**
 * The two glowing points (GMKarutan1.cpp:68-82): `CreateSprite(BITMAP_SHINY + 5, vPos, 1.2f, ...)` at
 * `TransformPosition(BoneTransform[13], (10, 0, -6))` and `[14], (10, 0, 6)`, no `* o->Scale`. The
 * nudges are in the bone's frame, a hundredth of a tile per unit.
 */
const GLOWS = [
  { bone: 13, nudge: new Vector3(0.1, 0, -0.06) },
  { bone: 14, nudge: new Vector3(0.1, 0, 0.06) },
] as const;

const GLOW_SCALE = 1.2;

/** `flumi * (1.9, 1.1, 1.1)`, `flumi = absf(sinf(WorldTime * 0.0004)) * 0.4f`. */
const GLOW_COLOR: readonly [number, number, number] = [1.9, 1.1, 1.1];

const at = Vector3.Zero();

/**
 * Karutan 66 (`Object81/Object67.bmd`, `so_liveC01`), ×6 in World81 and none
 * in World82 - the insect on the oasis rocks, two glowing points on bones
 * 13/14 (`GLOWS`, following its clips) and the carrier of `Karutan_insect_env`
 * (`sound.ts`). Never a batched prop: each plays its own clip.
 *
 * `if (o->AnimationFrame >= 19) SetAction(o, rand_fps_check(10) ? 1 : 0)`
 * (GMKarutan1.cpp:182-188) is a roll *per frame* over the tail of a 20-key
 * clip, not per loop: `SetAction` only bites when the action changes, so the
 * creature sits in clip 0 until a roll comes up 1, switches (which resets the
 * frame to 0 and ends the tail), then sits in clip 1 until a roll comes up 0.
 * At 0.15 keys/tick the tail is about seven ticks long, so a loop ends in the
 * other clip about half the time.
 *
 * Rolled per reference tick here for that reason - the odds belong to a tick,
 * and a frame-rate-driven roll would switch clips faster on a faster machine.
 */
export class KarutanInsectObject extends MapTileObject {
  static Batchable = false;

  #lastSeconds = -1;

  #ticks = 0;

  #glows: { node: TransformNode; nudge: Vector3; flare: MovableFlare }[] = [];

  #disposed = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.setAnimationSpeed(INSECT_PLAY_SPEED);

    for (const { bone, nudge } of GLOWS) {
      const node = findBone(this, bone) as TransformNode | null;
      if (!node) continue;

      const flare = await createMovableFlare(world.scene, GLOW_SCALE, GLOW_COLOR, 'shiny5');
      if (!flare) continue;

      if (this.#disposed) flare.dispose();
      else this.#glows.push({ node, nudge, flare });
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const glow of this.#glows) glow.flare.dispose();
    this.#glows = [];

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    this.#glow(seconds * 1000);

    // The original rolls from the render pass, and off screen the clip is
    // paused anyway, so its frame would never reach the tail.
    if (this.OutOfView || !this.Ready) return;

    if (this.actionFrame() < TAIL_FRAME) {
      this.#ticks = 0;
      return;
    }

    this.#ticks += delta * REFERENCE_FPS;

    while (this.#ticks >= 1) {
      this.#ticks -= 1;

      const next = Math.random() < SWITCH_ODDS ? 1 : 0;

      if (next !== this.CurrentAction) {
        this.playAction(next);
        return;
      }
    }
  }

  /** The two points ride their bones and breathe on `|sin|`. */
  #glow(ms: number): void {
    const lumi = Math.abs(Math.sin(ms * 0.0004)) * 0.4;

    for (const { node, nudge, flare } of this.#glows) {
      node.computeWorldMatrix(true);
      Vector3.TransformCoordinatesToRef(nudge, node.getWorldMatrix(), at);
      flare.moveTo(at.x, at.y, at.z);
      flare.setLuminosity(lumi);
    }
  }
}
