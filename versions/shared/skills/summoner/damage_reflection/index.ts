import { defineSkill } from '@/controllers/skills/define';
import { AliceCurse, CurseHand, aliceCurse, aliceGrace, curseHandLight, summonerHand } from '../_shared';
import { type RGB } from '@/controllers/fx/core';
import { onCurseLanding, seq } from '@/controllers/skills/visuals';

/** Thorns (0.8, 0.5, 0.2) and Berserker (1, 0.1, 0.2): the one Light on every layer. */
const THORNS: RGB = [0.8, 0.5, 0.2];
const CURSE_HAND_THORNS: CurseHand = { shiny: THORNS, pin: THORNS, puff: THORNS, dark: false };
/** Thorns: the circle at the caster and everything on the target in (0.8, 0.5, 0.2) (ZzzCharacter.cpp:5158-5206). */
const ALICE_THORNS: AliceCurse = { circle: THORNS, models: THORNS, flare: THORNS, shiny: THORNS, streak: THORNS, dark: false, on: 'targetOrSelf', grace: { light: THORNS, ember: [1, 0.6, 0.25] } };

export default defineSkill({
  id: 217,
  name: "Damage Reflection",
  // 217 Thorns (Damage Reflection): the SLEEP-clip hand in (0.8,0.5,0.2), then 14 ticks after the reply the
  // circle at the caster and the ALICE_BUFFSKILL rings on the target, or on the caster without one (aliceCurse).
  visual: {
    cast: summonerHand(CURSE_HAND_THORNS),
    impact: onCurseLanding(aliceCurse(ALICE_THORNS)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_THORNS), curseHandLight(CURSE_HAND_THORNS)), impact: onCurseLanding(seq(aliceCurse(ALICE_THORNS, true), aliceGrace(ALICE_THORNS))) },
  },
  buffs: {
    // 0x47 Reflection (eBuff_Thorns): rising pin lights.
    71: () => ({ pins: { colour: [0.9, 0.6, 0.1] } }),
  },
  sound: 'Sound/SE_Ch_summoner_skill02_ssonze', // Thorns
});
