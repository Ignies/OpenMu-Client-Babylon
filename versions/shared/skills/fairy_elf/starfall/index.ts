import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { arrow, model, seq, steelHit, ticks } from '@/controllers/skills/visuals';

import { ARROW_SECONDS } from '@/controllers/lighting/skills';
import { holy } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 46,
  name: "Starfall",
  // AT_SKILL_DEEPIMPACT shoots through SetPlayerHighBowAttack, which advances SwordCount (ZzzInterface.cpp:2523-2527,
  // ZzzCharacter.cpp:1316).
  swing: 'highBow',
  swordCount: true,
  // 46 Deep Impact (Starfall): the arrow, then MODEL_ARROW_IMPACT at its position.
  visual: { travel: arrow(MODEL.arrowLaser, RGBS.holy), impact: seq(model({ model: MODEL.arrowImpact, seconds: ticks(20), scale: 1, colour: RGBS.holy, grow: 1.4 }), steelHit) },
  sound: 'Sound/battlecastle/sCFireArrow', // Deep Impact
  // Starfall: MODEL_ARROW_IMPACT lights nothing in the original (:14596);
  // the holy wash riding the shot down is ours.
  light: { arrow: { ...holy(2, ARROW_SECONDS), release: 0.2 } },
});
