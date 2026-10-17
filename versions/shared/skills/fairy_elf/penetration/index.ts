import { defineSkill } from '@/controllers/skills/define';
import { ARC_MOTES, RGBS, TEX } from '@/controllers/fx/recipes';
import { CAST_HEIGHT, NO_KEY, after, afterRelease, atCaster, cm, fanArrows, flash, launcherShot, offset, particles, repeat, seq, sprite, steelHit, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';

import { ARROW_SECONDS } from '@/controllers/lighting/skills';
import { arc } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 52,
  name: "Penetration",
  checksArrows: true, // CheckArrow() before the shot (ClassAttack.cpp:132)
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [416],
  // 52 Penetration: charge t=3 BITMAP_GATHERING sub0 LT 10 at (−100 fwd, +150 z) - 3 a frame JOINT_THUNDER sub3 /
  // SPARK+1 sub2 on a r=120 ring + SHINY+1 sprite; impact: CreateArrows(sub 2).
  visual: {
    cast: after(ticks(3), atCaster(offset(seq(
      repeat(5, ticks(2), (p, c) => {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const from = new Vector3(p.x + Math.cos(a) * cm(120), p.y + (Math.random() - 0.5) * 0.6, p.z + Math.sin(a) * cm(120));
          effects.spawn('joint', c.scene, from, { to: p, colour: RGBS.arc, seconds: ticks(6), width: 0.06, jitter: 0.12 });
        }
      }),
      sprite({ texture: TEX.shiny2, colour: RGBS.arc, size: 1.2, seconds: ticks(10), grow: 1.6 }),
      particles({ recipe: ARC_MOTES, count: 12 })
    ), -1, 0.4), CAST_HEIGHT)),
    // The arrow at the release, AttackTime 5: no clip key forces it (ZzzCharacter.cpp:2762-2780, :4898-4901).
    area: afterRelease((at, c) => {
      const s = launcherShot(c.caster); // the bow's own arrow, SubType 2 (CreateArrow, ZzzEffectMagicSkill.cpp:185-300)
      fanArrows(at, c, 1, s.model, s.colour);
    }, { clips: NO_KEY, limit: 5 }),
    impact: seq(steelHit, flash(TEX.pierce, RGBS.arc, 1.2, 0.3)),
  },
  sound: 'Sound/ePiercing', // Penetration
  // Penetration: the original fires the launcher arrow (MODEL_ARROW_STEEL on
  // a crossbow, which lights nothing); this client draws it charged
  // blue-white, so the arc is ours.
  light: { arrow: { ...arc(2, ARROW_SECONDS), release: 0.2 } },
});
