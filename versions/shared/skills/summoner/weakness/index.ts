import { defineSkill } from '@/controllers/skills/define';
import { CurseHand, ZinCurse, curseHandLight, summonerHand, zinCurse, zinGrace } from '../_shared';
import { onCurseLanding, seq } from '@/controllers/skills/visuals';

import { SLEEP_CLIPS } from '../_shared';

/** Weakness: the pin and puff branches test THORNS twice, so they keep the shiny's (0.8,0.1,0.1). */
const CURSE_HAND_WEAKNESS: CurseHand = { shiny: [0.8, 0.1, 0.1], pin: [0.8, 0.1, 0.1], puff: [0.8, 0.1, 0.1], dark: false };

const ZIN_WEAKNESS: ZinCurse = { wide: [2, 0.1, 0.1], core: [2, 0.4, 0.3], rain: [1.4, 0.2, 0.2] };

export default defineSkill({
  id: 221,
  name: "Weakness",
  soundOnLanding: true, // with the effect at AttackTime 15 (ZzzCharacter.cpp:5213-5223)
  // 221 Weakness (459 Str) / 222 Enervation (Innovation, 460 Str): the hand FX, then 14 ticks later at the
  // caster's feet the ZIN circles and ripples, the three Suhwanzin circles and the glitter rain, and the sound.
  visual: {
    cast: summonerHand(CURSE_HAND_WEAKNESS),
    impact: onCurseLanding(zinCurse(ZIN_WEAKNESS)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_WEAKNESS), curseHandLight(CURSE_HAND_WEAKNESS)), impact: onCurseLanding(seq(zinCurse(ZIN_WEAKNESS), zinGrace(ZIN_WEAKNESS))) },
  },
  buffs: {
    // 0x4C Weakness, 0x4D Innovation: shiny drops (with their flare01 underlay) and falling pin lights off random bones.
    76: () => ({ boneSparks: { colour: [1.4, 0.2, 0.2], underlay: true, pins: true } }),
  },
  sound: 'Sound/SE_Ch_summoner_weakness', // Weakness
  delayMs: 4000, // Weakness
  clip: SLEEP_CLIPS, // Weakness
  target: 'inPlace',
});
