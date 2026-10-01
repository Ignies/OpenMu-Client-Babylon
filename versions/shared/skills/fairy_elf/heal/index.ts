import { defineSkill } from '@/controllers/skills/define';
import { IMPACT_HEIGHT, cm, magicGround, repeat, ticks } from '@/controllers/skills/visuals';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { followEntity } from '@/controllers/fx/core';

import { holy } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 26,
  name: "Heal",
  // 26 Heal: BITMAP_MAGIC+1 sub1 LT 20 at the target → per frame 3× JOINT_HEALING from a r=200 sphere to the
  // target, width 5, LT 12, MaxTails 2.
  visual: {
    impact: (at, c) => {
      magicGround(RGBS.holy)(at, c);
      const to = c.target ? followEntity(c.target, IMPACT_HEIGHT * 0.6) : at;
      repeat(6, ticks(2), (p, cc) => {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const e = Math.random() * Math.PI - Math.PI / 2;
          const from = new Vector3(p.x + Math.cos(a) * Math.cos(e) * 2, p.y + Math.sin(e) * 2 + 0.5, p.z + Math.sin(a) * Math.cos(e) * 2);
          effects.spawn('joint', cc.scene, from, { to, colour: RGBS.holy, seconds: ticks(12), width: cm(5), segments: 2, jitter: 0.05, texture: TEX.jointEnergy });
        }
      })(at, c);
    },
  },
  // Heal: MODEL_MAGIC_CIRCLE1 range 3 (:9705).
  light: { impact: holy(3, 1.0) },
});
