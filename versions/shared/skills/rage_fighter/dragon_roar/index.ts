import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fireHit, model, scatter, seq, shockRing } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 264,
  name: "Dragon Roar",
  visual: { area: seq(model({ model: MODEL.dragonHead, seconds: 1, colour: RGBS.fire, grow: 1.5, scale: 1.5 }), shockRing(RGBS.fire, 5), scatter(fireHit, 5, 2, 0.05)) },
});
