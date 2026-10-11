import { defineSkill } from '@/controllers/skills/define';
import { AliceCurse, CurseHand, aliceCurse, aliceGrace, summonerHand } from '../_shared';
import { onCurseLanding, seq } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

const CURSE_HAND_BLIND: CurseHand = { shiny: [1, 1, 1], pin: [1, 1, 1], puff: [1, 1, 1], dark: true };
const ALICE_BLIND: AliceCurse = { circle: [1, 1, 1], models: [1, 1, 1], flare: [1, 1, 1], shiny: [1, 1, 1], streak: [1, 1, 1], dark: true };

export default defineSkill({
  id: 220,
  name: "Blind",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [461, 463],
  // 220 Blind (OpenMU's 461 / 463): Sleep's construction drawn entirely subtractive - black smoke at the
  // hand, a black disc spreading under the caster, a black imploding vortex on the target.
  visual: {
    cast: summonerHand(CURSE_HAND_BLIND),
    impact: onCurseLanding(aliceCurse(ALICE_BLIND)),
    enhanced: { impact: onCurseLanding(seq(aliceCurse(ALICE_BLIND), aliceGrace(ALICE_BLIND))) },
  },
  buffs: {
    // 0x49 Blind: black cra_04 smoke off random bones.
    73: () => ({ blindSmoke: true }),
  },
  sound: 'Sound/SE_Ch_summoner_skill04_blind', // Blind
  // Blind: PLAYER_SKILL_SLEEP with no mount ladder (WSclient.cpp:4921-4927); OpenMU casts it as 461 / 463.
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Blind
});
