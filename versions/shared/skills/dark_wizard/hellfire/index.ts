import { defineSkill } from '@/controllers/skills/define';
import { FIRE_SPARKS, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Step, TICK, after, atCaster, burn, model, particles, perTick, repeat, scorch, seq, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { bonePos } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';
import { stones } from '../../_shared';

/**
 * `c->AttackTime >= g_iLimitAttackTime` - 15 ticks (ZzzCharacter.cpp:90). The
 * wizard's leap in `player_action_154` lands around tick 12, so the ground
 * effect follows him down rather than waiting on the clip.
 */
const HELLFIRE_TOUCHDOWN = 15;
/**
 * The caster alight: `if (o->CurrentAction == PLAYER_SKILL_HELL &&
 * rand_fps_check(1))` spawns BITMAP_FIRE off ten random bones every tick
 * (ZzzCharacter.cpp:5633-5639), so the wizard burns for the whole jump instead
 * of only where he lands. Ten cards a tick is a particle system's price, not a
 * sprite layer's; four reads the same at a quarter of the spawns.
 */
const bodyFire = (tickCount: number, perTick: number): Step =>
  repeat(tickCount, TICK, (_at, c) => {
    const bones = c.caster.modelObject?.gltf?.skeleton?.bones.length ?? 0;
    if (bones <= 1) return;

    for (let i = 0; i < perTick; i++) {
      const bone = Math.floor(Math.random() * (bones - 1));
      effects.spawn('sprite', c.scene, bonePos(c.caster, bone, new Vector3()), {
        texture: TEX.fire,
        colour: RGBS.fire,
        size: 0.5,
        seconds: ticks(8),
        fadeTail: 0.6,
      });
    }
  });

export default defineSkill({
  id: 10,
  name: "Hellfire",
  /**
   * 10 Hellfire. The skill is a leap: `SetAction(o, PLAYER_SKILL_HELL)` and
   * `c->AttackTime = 1` at the cast (ZzzInterface.cpp:5900-5906), the wizard
   * burning off random bones the whole way up (ZzzCharacter.cpp:5633), and the
   * ground only opens once he is back on it - `MoveCharacter` holds the branch
   * until `c->AttackTime >= g_iLimitAttackTime`, 15 ticks, and only then
   * creates MODEL_CIRCLE (LT 45) + MODEL_CIRCLE_LIGHT (LT 40) at `o->Position`
   * (ZzzCharacter.cpp:4307-4318, g_iLimitAttackTime at :90).
   *
   * The clip carries the jump itself: the root bone of `player_action_154`
   * climbs 0.58 → 3.52 over its first five keys and is back down by key 6, so
   * at the action's own PlaySpeed the wizard touches down around tick 12 and
   * the fire follows him in about three ticks later. Firing the circle at the
   * cast instead - which is what this row did, the `0.05` being `atCaster`'s
   * *height* and not a delay - put the whole ground effect under a wizard who
   * was still in the air, and left nothing at all for the landing.
   */
  visual: {
    cast: bodyFire(HELLFIRE_TOUCHDOWN, 4),
    area: after(
      ticks(HELLFIRE_TOUCHDOWN),
      atCaster(
        seq(
          // Not `flat` - despite the name. `Skill/Circle01` is an 8x8 disc with
          // zero thickness in Z, because MU authors ground planes in XY (Z is
          // up there), and `flat` skips the Z-up-to-Y-up basis change that lays
          // it down. It stood the fire ring on its edge like a wall.
          model({ model: MODEL.circle, seconds: ticks(45), colour: RGBS.fire, scale: 1, grow: 1.3 }),
          model({ model: MODEL.circle2, seconds: ticks(40), colour: [1, 0.8, 0.2], scale: 1, spin: 2 }),
          stones(6, 2),
          particles({ recipe: FIRE_SPARKS, count: 30 }),
          // The whole circle the stones are thrown from, not a bolt's footprint.
          scorch(2.6),
          burn(2.6)
        ),
        0.05
      )
    ),
  },
  sound: 'Sound/sHellFire', // Hellfire
});
