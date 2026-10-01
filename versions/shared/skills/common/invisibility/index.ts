import { defineSkill } from '@/controllers/skills/define';
import { RGBS, SOUL_MOTES } from '@/controllers/fx/recipes';
import { magicGround, particles, seq, ticks } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 70,
  name: "Invisibility",
  // 70 Cloaking / Invisible: BITMAP_MAGIC+1 sub6 at the target LT 60, Scale 2–4; BITMAP_LIGHT on random bones per frame.
  visual: { impact: seq(magicGround(RGBS.soul, ticks(60), 3), particles({ recipe: SOUL_MOTES, rate: 30, seconds: ticks(60), height: 0.5 })) },
});
