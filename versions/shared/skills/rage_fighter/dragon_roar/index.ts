import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fireHit, model, scatter, seq, shockRing } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 264,
  name: "Dragon Roar",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [560],
  noFlinch: [A.PLAYER_SKILL_DRAGONLORE], // SetPlayerShock leaves the roar alone (ZzzCharacter.cpp:1283-1297)
  visual: { area: seq(model({ model: MODEL.dragonHead, seconds: 1, colour: RGBS.fire, grow: 1.5, scale: 1.5 }), shockRing(RGBS.fire, 5), scatter(fireHit, 5, 2, 0.05)) },
  sound: 'Sound/Ragefighter/Rage_Dragonlower', // Dragon Roar
  delayMs: 700, // Dragon Roar
  clip: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar
});
