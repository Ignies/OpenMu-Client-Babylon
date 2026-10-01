import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { arrow, model, seq, steelHit, ticks } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 46,
  name: "Starfall",
  // 46 Deep Impact (Starfall): the arrow, then MODEL_ARROW_IMPACT at its position.
  visual: { travel: arrow(MODEL.arrowLaser, RGBS.holy), impact: seq(model({ model: MODEL.arrowImpact, seconds: ticks(20), scale: 1, colour: RGBS.holy, grow: 1.4 }), steelHit) },
});
