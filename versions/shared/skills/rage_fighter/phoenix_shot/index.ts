import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fanArrows, fireHit, model, seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 270,
  name: "Phoenix Shot",
  visual: { area: (at, c) => { fanArrows(at, c, 1, MODEL.phoenixShot, RGBS.fire, 0, 1.5); }, impact: seq(fireHit, model({ model: MODEL.phoenix, seconds: 0.8, colour: RGBS.fire, grow: 1.5, scale: 1.5 })) },
});
