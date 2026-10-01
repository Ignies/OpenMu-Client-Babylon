import { defineSkill } from '@/controllers/skills/define';
import { Step, burn, scorch, seq } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { delay } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';

/**
 * `n` fire pillars (effects/pillar.ts): the first on the point, the rest scattered `radius` tiles
 * around it a third to the full way out, `every` seconds apart, each on its own ground height.
 */
const firePillars = (n: number, radius: number, every: number): Step => (at, c) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * (Math.PI / n);
    const r = i === 0 ? 0 : radius * (0.55 + Math.random() * 0.45);
    const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
    if (i === 0) effects.spawn('pillar', c.scene, p, {});
    else delay(i * every, () => effects.spawn('pillar', c.scene, p, {}));
  }
};

export default defineSkill({
  id: 5,
  name: "Flame",
  // 5 Flame: the renewed look - fire pillars out of molten rock around the point (effects/pillar.ts), in place
  // of the BITMAP_FLAME sub0 LT 40 tongue column the original stacked at SkillXY (ZzzCharacter.cpp:4485).
  visual: { area: seq(firePillars(3, 1.4, 0.1), scorch(1.5), burn(1.2)) },
  sound: 'Sound/sFlame', // Flame
});
