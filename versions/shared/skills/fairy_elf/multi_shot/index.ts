import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fanArrows, steelHit, ticks } from '@/controllers/skills/visuals';
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
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [411, 431],
  // 235 Multi-Shot: MODEL_BLADE_SKILL sub1 at the packet fires one arrow every 2 ticks from tick 0 to 10, each turned
  // +-7/21/35 deg off the facing (MoveHandlers.cpp:332-415; WSclient.cpp:5381-5430). The muzzle volley is 3x
  // MODEL_MULTI_SHOT1 at the caster and 2x MULTI_SHOT2 / MULTI_SHOT3 20 cm ahead, Light (0.8,0.9,1.6).
  visual: {
    area: (at, c) => {
      fanArrows(at, c, ARROWS, MODEL.arrow, RGBS.steel, bladeTurns(), 1, ticks(2));
      multiShotVolley(at, c);
    },
    impact: steelHit,
  },
});
