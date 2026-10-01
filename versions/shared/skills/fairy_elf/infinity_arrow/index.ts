import { defineSkill } from '@/controllers/skills/define';
import { ICE_MOTES, RGBS, TEX } from '@/controllers/fx/recipes';
import { flash, particles, seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 77,
  name: "Infinity Arrow",
  // 77 Infinity Arrow: blue flash; aura persists via BUFF_VISUALS.
  visual: { impact: seq(flash(TEX.flareBlue, RGBS.ice, 1.4, 0.6), particles({ recipe: ICE_MOTES, count: 16, height: 0.6 })) },
  // 76 Plasma Storm: SOUND_FENRIR_SKILL plays with the bolts 14 ticks later (skillVisuals plasmaStorm).
  sound: 'Sound/infinityArrow', // Infinity Arrow
});
