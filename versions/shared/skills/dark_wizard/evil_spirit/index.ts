import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { followEntity, type PointSource } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { atCaster, cm, perTick, tiered, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { groundAt, rad } from '../../_shared';
import { spiritSwarm } from './swarm';

/** JOINT_SPIRIT sub0: 70 cm a tick, LT 49, 6 tails (ZzzEffectJoint.cpp:649-658). */
const SPIRIT_SPEED = perTick(70);
const SPIRIT_TICKS = 49;
const SPIRIT_TAILS = 6;
/** The pair's two widths: the wide one carries the skull (`Scale == 80`). */
const SPIRIT_WIDTHS = [cm(80), cm(20)];
/** `Light = LifeTime * 0.1`: dark until its last 10 ticks. */
const SPIRIT_FADE = 10 / SPIRIT_TICKS;
/** MoveHumming toward the caster + 80z at 10 deg a tick, damped +-3.2 / +-12.8 deg kicks, terrain + 100..400. */
const SPIRIT_STEER = { seekRate: rad(10), wander: { pitch: rad(3.2), yaw: rad(12.8) }, band: { floor: 1, ceiling: 4 } };
/** MODEL_LASER: Scale 1.3, RENDER_DARK (ZzzEffect.cpp:1832-1838); Laser01's snout is its -Z. */
const SKULL_SCALE = 1.3;
/** AddTerrainLight(-(rand() % 4 + 4) * 0.01, range 4) at each head: a dark ground card 8 tiles across. */
const GROUND_DARK = 0.055;
const GROUND_SIZE = 8;

export default defineSkill({
  id: 9,
  name: "Evil Spirit",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [385],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [487],
  // 9 Evil Spirit (ZzzCharacter.cpp:4584-4604): from the caster + 100z, four JOINT_SPIRIT sub0 pairs at
  // Angle(0, 0, i * 90), widths 80 and 20: ALPHA_BLEND_MINUS on JointSpirit01, homing the caster
  // (ZzzEffectJoint.cpp:3745-3830). The wide one stamps MODEL_LASER at its head every tick on the
  // joint's angle, LT 1. Nothing bright: no smoke trail or screen shroud.
  // Skill effects: Enhanced flies our swarm instead (./swarm.ts).
  visual: {
    area: tiered(atCaster((at, c) => {
      const seconds = ticks(SPIRIT_TICKS);
      const steer = { ...SPIRIT_STEER, seek: followEntity(c.caster, cm(80)) };
      for (let i = 0; i < 4; i++) {
        const heading = new Vector3(Math.sin(rad(i * 90)), 0, Math.cos(rad(i * 90)));
        for (const width of SPIRIT_WIDTHS) {
          const head = at.clone();
          const ground: PointSource = out => out.set(head.x, groundAt(head.x, head.z, at.y - 1) + cm(5), head.z);
          effects.spawn('joint', c.scene, at, {
            velocity: SPIRIT_SPEED,
            heading,
            steer,
            maxTails: SPIRIT_TAILS,
            width,
            colour: RGBS.white,
            blend: 'subtract',
            texture: TEX.jointSpirit,
            seconds,
            fadeTail: SPIRIT_FADE,
            track: h => head.copyFrom(h),
          });
          effects.spawn('sprite', c.scene, at, { texture: TEX.flare, flat: true, blend: 'subtract', cover: GROUND_DARK, size: GROUND_SIZE, seconds, fadeTail: 0, follow: ground });
          if (width !== SPIRIT_WIDTHS[0]) continue;
          effects.spawn('model', c.scene, at, {
            model: MODEL.laser,
            scale: SKULL_SCALE,
            blend: 'subtract',
            seconds,
            fadeTail: SPIRIT_FADE,
            follow: out => out.copyFrom(head),
            aim: true,
            aimYaw: Math.PI,
          });
        }
      }
    }, 1), atCaster(spiritSwarm, 1)),
  },
  // 8 Twister (sTornado) and 12 Aqua Beam (sAquaFlash): none at the cast, the effect plays them at AttackTime 15
  // (ZzzCharacter.cpp:4496, :4553; controllers/skills/visuals.ts).
  sound: 'Sound/sEvil', // Evil Spirit
  // Evil Spirit: nothing, as the original - the spirits are shadow. The empty row also keeps the
  // wizardry cast flash off (castRecipeFor).
  light: {},
});
