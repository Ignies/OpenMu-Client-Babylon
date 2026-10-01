import { defineSkill } from '@/controllers/skills/define';
import { ICE_MOTES, MODEL, RGBS, SMOKE, TEX } from '@/controllers/fx/recipes';
import { IMPACT_HEIGHT, arrow, cm, hitSparks, orbiting, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';

export default defineSkill({
  id: 51,
  name: "Ice Arrow",
  // 51 Ice Arrow: cast - MODEL_ICE sub1 + sub2 (+180°) at the target LT 20, Scale 0.8, BlendMeshLight 0.5, 3× BITMAP_SMOKE,
  // a BITMAP_FIRE+2 sub10 orbiting r=60; impact: a single arrow.
  visual: {
    travel: arrow(MODEL.arrow, RGBS.ice),
    impact: (at, c) => {
      const feet = at.clone();
      feet.y -= IMPACT_HEIGHT;
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5] });
      effects.spawn('model', c.scene, feet, { model: MODEL.ice, seconds: ticks(20), scale: 0.8, colour: [0.5, 0.5, 0.5], yaw: Math.PI });
      effects.spawn('particles', c.scene, feet, { recipe: SMOKE, count: 3, height: 0.3 });
      if (c.target) effects.spawn('sprite', c.scene, feet, { texture: TEX.fire3, colour: RGBS.ice, size: 0.5, seconds: ticks(20), follow: orbiting(c.target, cm(60), 0.3, 4, 0), spin: 3 });
      hitSparks(ICE_MOTES, 10)(at, c);
    },
  },
});
