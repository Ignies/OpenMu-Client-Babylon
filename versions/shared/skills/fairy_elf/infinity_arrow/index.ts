import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { ICE_MOTES } from '../_shared';
import { flash, particles, seq, tiered } from '@/controllers/skills/visuals';
import { infinityArrowRings } from './rings';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 77,
  name: "Infinity Arrow",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [441],
  // 77 Infinity Arrow: MODEL_INFINITY_ARROW at the caster and its rings (WSclient.cpp:4882-4888, ./rings.ts).
  // Skill effects: Enhanced keeps ours, a blue flash with ice motes.
  visual: { impact: tiered(infinityArrowRings, seq(flash(TEX.flareBlue, RGBS.ice, 1.4, 0.6), particles({ recipe: ICE_MOTES, count: 16, height: 0.6 }))) },
  // 76 Plasma Storm: SOUND_FENRIR_SKILL plays with the bolts 14 ticks later (skillVisuals plasmaStorm).
  sound: 'Sound/infinityArrow', // Infinity Arrow
  delayMs: 200, // Infinity Arrow
  // --- Fairy Elf ----------------------------------------------------------
  // Infinity Arrow is the one skill that plays a *social* clip, and only on
  // foot - mounted it falls back to SetPlayerMagic (:4967-4975), which is
  // what an absent mount row means here.
  clip: { ground: A.PLAYER_RUSH1 }, // Infinity Arrow
  target: 'self',
  // Original: each flare joint's white AddTerrainLight, range 1, every move (ZzzEffectJoint.cpp:6013-6015; rings.ts),
  // over the rings' 40 ticks of joints and the last one's 35.
  light: { bodies: { flare: { color: [1, 1, 1], range: 1, seconds: 75 * 0.04, release: 0.1 } } },
});
