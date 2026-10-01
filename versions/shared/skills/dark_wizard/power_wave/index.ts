import { defineSkill } from '@/controllers/skills/define';
import { DW1_RELEASE, bearing, monsterOf, releaseSound } from '../_shared';
import { MODEL, POWER_WAVE_GLINTS, POWER_WAVE_SKIM, POWER_WAVE_SMOKE, RGBS, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, fxNow, type PointSource, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, forwardOf, perTick, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { rad } from '../../_shared';

import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_ICE_QUEEN throws two more Power Waves at +-10 deg (ZzzCharacter.cpp:5045-5052). */
const ICE_QUEEN = 25;
const POWER_WAVE_TICKS = 20;

/** MODEL_MAGIC2's `BlendMeshLight = LifeTime * 0.1` (MoveHandlers.cpp:3351): 2.0 falling, drawn clamped at 1. */
const powerWaveLight = (t: number): number => Math.min(1, (POWER_WAVE_TICKS - Math.floor(t / TICK)) * 0.1);

/**
 * One MODEL_MAGIC2 (ZzzEffect.cpp:1991-1998): from the caster's feet along `yaw` at 60 cm a tick for its
 * 20 ticks at a constant height, through the target and past it, Scale 0.9. Its one mesh is the blend mesh,
 * the magic_g sheet scrolling +0.2 U a tick; 4 BITMAP_SMOKE sub3 a tick and the light at its foot
 * (MoveHandlers.cpp:3346-3361). Terrain-lit in the original; white stands in.
 */
function powerWaveSheet(c: SkillContext, feet: Vector3, yaw: number, look?: WaveLook): void {
  const f = forwardOf(yaw);
  const speed = perTick(60);
  const t0 = fxNow();
  const reach = (): number => Math.min(fxNow() - t0, ticks(POWER_WAVE_TICKS)) * speed;
  const path: PointSource = out => {
    const d = reach();
    return out.set(feet.x + f.x * d, feet.y, feet.z + f.z * d);
  };
  effects.spawn('model', c.scene, feet, { model: MODEL.magic2, follow: path, yaw, scale: 0.9, colour: look?.colour ?? RGBS.white, seconds: ticks(POWER_WAVE_TICKS), blendMesh: 0, blendLight: powerWaveLight, fadeTail: 0, uvScroll: 0.2 });
  effects.spawn('particles', c.scene, feet, { recipe: POWER_WAVE_SMOKE, rate: 100, seconds: ticks(POWER_WAVE_TICKS), follow: path });
  look?.extra(c, feet, path);
  lighting.skillLand(c.scene, 11, feet, out => {
    const d = reach();
    out.x = feet.x + f.x * d;
    out.y = feet.y;
    out.z = feet.z + f.z * d;
  });
}

/** What the graded tiers change on one MODEL_MAGIC2: its tint, and what they add given its start and its moving foot. */
interface WaveLook {
  colour: RGB;
  extra: (c: SkillContext, feet: Vector3, path: PointSource) => void;
}

/** 11 Power Wave (ZzzCharacter.cpp:5044-5055): at the release, MODEL_MAGIC2 from the caster's feet toward the target; SOUND_MAGIC. */
const powerWave = (look?: WaveLook): Step => (_at, c) => {
  delay(DW1_RELEASE, () => {
    if (entityGone(c.caster)) return;
    const feet = entityPos(c.caster, 0, new Vector3());
    const yaw = bearing(c, feet);
    if (monsterOf(c.caster) === ICE_QUEEN) {
      powerWaveSheet(c, feet, yaw + rad(10), look);
      powerWaveSheet(c, feet, yaw - rad(10), look);
    }
    powerWaveSheet(c, feet, yaw, look);
    releaseSound('Sound/sMagic')(feet, c);
  });
};

/**
 * Power Wave on the graded tiers, around the same sheet (tinted, POWER_WAVE_LOOK): a launch ring at the caster's feet, a blue glow on the
 * ground riding under the sheet, a low haze it drags along and cold glints thrown off it, all fading with it.
 */
const powerWaveExtra: WaveLook['extra'] = (c, feet, path) => {
  const life = ticks(POWER_WAVE_TICKS);
  effects.spawn('ring', c.scene, feet, { texture: TEX.shockwave, colour: [0.4, 0.65, 1], scale: 0.8, grow: 2.2, growFrom: 0.5, seconds: 0.35, fadeTail: 0.7 });
  effects.spawn('ring', c.scene, feet, { texture: TEX.flare, colour: [0.4, 0.7, 1], scale: 2.2, growFrom: 0.7, seconds: life, fadeTail: 0.5, follow: path });
  effects.spawn('particles', c.scene, feet, { recipe: POWER_WAVE_SKIM, rate: 30, seconds: life, follow: path, height: 0.05 });
  effects.spawn('particles', c.scene, feet, { recipe: POWER_WAVE_GLINTS, rate: 45, seconds: life * 0.8, follow: path, height: 0.45 });
};

/** The sheet a shade under white, so its body keeps the magic_g streaks under the tone curve instead of clipping flat. */
const POWER_WAVE_LOOK: WaveLook = { colour: [0.55, 0.75, 1], extra: powerWaveExtra };

/** MODEL_MAGIC2's `(0.3, 0.6, 1) x Luminosity` range 3, riding the wave for its 20 ticks. */
const POWER_WAVE_LIGHT: LightRecipe = {
  color: [0.3, 0.6, 1],
  range: 3,
  seconds: 20 * 0.04,
  release: 0.04,
  flicker: { min: 0.7, max: 1, steps: 4 },
};

export default defineSkill({
  id: 11,
  name: "Power Wave",
  // 11 Power Wave: at the release, MODEL_MAGIC2 slides from the caster's feet toward the target and on past it (powerWave).
  // Enhanced: a ground glow, haze and glints riding the same sheet.
  visual: { impact: powerWave(), enhanced: { impact: powerWave(POWER_WAVE_LOOK) } },
  // Power Wave: MODEL_MAGIC2's light rides the wave from the release, laid by the effect (MoveHandlers.cpp:3360-3361).
  // Enhanced: the sheet's cold blue over the ~1.2 tiles its art and glow reach, fading with it over the last 10 ticks.
  light: { land: POWER_WAVE_LIGHT, enhanced: { land: effectLight([0.35, 0.6, 1], 1.2, 20 * 0.04, { release: 10 * 0.04, flicker: { min: 0.8, max: 1, steps: 4 } }) } },
});
