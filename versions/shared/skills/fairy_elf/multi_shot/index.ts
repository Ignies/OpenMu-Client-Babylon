import { defineSkill } from '@/controllers/skills/define';
import { fanArrows, launcherShot, steelHit, ticks } from '@/controllers/skills/visuals';
import { DEG, multiShotVolley } from '../../_shared';

/** MODEL_BLADE_SKILL sub1's yaw offsets (MoveHandlers.cpp:369-388). */
const BLADE_TURNS = [7, 21, 35, -7, -21, -35].map(d => d * DEG);

/** LifeTime 14 (ZzzEffect.cpp:521-529), an arrow on every even LifeTime >= 3: 14, 12 .. 4, six arrows two ticks apart. */
const ARROWS = 6;

/** One of the six turns per arrow, never the one before (`Ran != m_sTargetIndex`, MoveHandlers.cpp:356-367). */
function bladeTurns(): number[] {
  const out: number[] = [];
  let last = -1;
  for (let i = 0; i < ARROWS; i++) {
    let k = Math.floor(Math.random() * 6);
    while (k === last) k = Math.floor(Math.random() * 6);
    out.push(BLADE_TURNS[k]);
    last = k;
  }
  return out;
}

export default defineSkill({
  id: 235,
  name: "Multi-Shot",
  checksArrows: true, // CheckArrow() before the shot (ClassAttack.cpp:328)
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [411, 431],
  // 235 Multi-Shot: MODEL_BLADE_SKILL sub1 at the packet fires one arrow every 2 ticks from tick 0 to 10, each turned
  // +-7/21/35 deg off the facing (MoveHandlers.cpp:332-415; WSclient.cpp:5381-5430). The muzzle volley
  // (multiShotVolley): 3x MODEL_MULTI_SHOT1, 2x MULTI_SHOT2 and 2x MULTI_SHOT3 growing where they are made, ahead of the caster.
  visual: {
    area: (at, c) => {
      const s = launcherShot(c.caster); // the bow's own arrow (CreateArrow, ZzzEffectMagicSkill.cpp:174-251)
      fanArrows(at, c, ARROWS, s.model, s.colour, bladeTurns(), 1, ticks(2));
      multiShotVolley(at, c);
    },
    impact: steelHit,
  },
});
