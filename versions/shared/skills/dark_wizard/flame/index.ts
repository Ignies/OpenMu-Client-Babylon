import { defineSkill } from '@/controllers/skills/define';
import { Step, TICK, burn, cm, perTick, repeat, scorch, seq, ticks, tiered } from '@/controllers/skills/visuals';
import { MODEL } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { delay } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { EFFECT_LUMINOSITY } from '@/controllers/lighting/skills';
import { flame } from '@/controllers/lighting/recipes';
import { lightAt } from '../../_shared';

/**
 * `n` fire pillars (controllers/fx/pillar.ts): the first on the point, the rest scattered `radius` tiles
 * around it a third to the full way out, `every` seconds apart, each on its own ground height.
 */
const firePillars = (n: number, radius: number, every: number): Step => (at, c) => {
  lighting.skillSpot(c.scene, 5, 'pillars', lightAt(at));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * (Math.PI / n);
    const r = i === 0 ? 0 : radius * (0.55 + Math.random() * 0.45);
    const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    if (i === 0) effects.spawn('pillar', c.scene, p, {});
    else delay(i * every, () => effects.spawn('pillar', c.scene, p, {}));
  }
};

/** BITMAP_FLAME sub0 (ZzzEffect.cpp:1080-1084): LT 40, six BITMAP_FLAME tongues a tick within 25 cm, each LT 20 rising
 * 19-38 cm a tick (ZzzEffectParticle.cpp:579-583), and a MODEL_STONE1/2 one tick in 8 (MoveHandlers.cpp:1802-1814). */
const FLAME_TICKS = 40;
const FLAME_COLUMN = { seconds: ticks(FLAME_TICKS), radius: cm(25), rate: 6 / TICK, rise: perTick(28.7) };
const flameColumn: Step = (at, c) => {
  lighting.skillSpot(c.scene, 5, 'column', lightAt(at));
  effects.spawn('column', c.scene, at, FLAME_COLUMN);
  repeat(FLAME_TICKS, TICK, (p, cc) => {
    if (Math.random() * 8 < 1) effects.spawn('debris', cc.scene, p, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2 });
  })(at, c);
};

export default defineSkill({
  id: 5,
  name: "Flame",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [378],
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [483],
  // 5 Flame: the original's BITMAP_FLAME sub0 tongue column at SkillXY (ZzzCharacter.cpp:4479-4485).
  // Skill effects: Enhanced raises our fire pillars out of molten rock around the point (controllers/fx/pillar.ts).
  visual: { area: tiered(flameColumn, seq(firePillars(3, 1.4, 0.1), scorch(1.5), burn(1.2))) },
  sound: 'Sound/sFlame', // Flame
  // `column`: Move_BITMAP_FLAME sub0's (1, 0.4, 0) x Luminosity in range 3 for its 40 ticks (MoveHandlers.cpp:1815-1816).
  // `pillars` (ours, Enhanced skill effects): wider and redder, the ground around the pillars pools red.
  light: {
    spots: {
      column: { color: [1, 0.4, 0], range: 3, seconds: ticks(FLAME_TICKS), release: TICK, flicker: EFFECT_LUMINOSITY },
      pillars: { ...flame(3.5, 1.9, { gain: 1.5, floorGain: 1.3, release: 0.6 }), color: [1, 0.42, 0.14] },
    },
  },
});
