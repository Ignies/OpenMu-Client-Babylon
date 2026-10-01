import { defineSkill } from '@/controllers/skills/define';
import { ICE_MOTES, RGBS, TEX } from '@/controllers/fx/recipes';
import { flash, particles, seq } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 77,
  name: "Infinity Arrow",
  // 77 Infinity Arrow: blue flash; aura persists via BUFF_VISUALS.
  visual: { impact: seq(flash(TEX.flareBlue, RGBS.ice, 1.4, 0.6), particles({ recipe: ICE_MOTES, count: 16, height: 0.6 })) },
  // 76 Plasma Storm: SOUND_FENRIR_SKILL plays with the bolts 14 ticks later (skillVisuals plasmaStorm).
  sound: 'Sound/infinityArrow', // Infinity Arrow
  delayMs: 200, // Infinity Arrow
  // --- Fairy Elf ----------------------------------------------------------
  // Infinity Arrow is the one skill that plays a *social* clip, and only on
  // foot - mounted it falls back to SetPlayerMagic (:4967-4975), which is
  // what an absent mount row means here.
  clip: { ground: A.PLAYER_RUSH1 }, // Infinity Arrow
});
