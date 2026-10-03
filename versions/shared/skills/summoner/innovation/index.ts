import { defineSkill } from '@/controllers/skills/define';
import { CurseHand, ZinCurse, curseHandLight, summonerHand, zinCurse, zinGrace } from '../_shared';
import { onCurseLanding, seq } from '@/controllers/skills/visuals';

import { SLEEP_CLIPS } from '../_shared';

/** Enervation: the shiny branch writes `Light`, not `vLight`, so its pair stays white (:10628). */
const CURSE_HAND_ENERVATION: CurseHand = { shiny: [1, 1, 1], pin: [0.25, 1, 0.7], puff: [0.25, 1, 0.7], dark: false };
const ZIN_ENERVATION: ZinCurse = { wide: [0.25, 1, 0.7], core: [0.25, 1, 0.7], rain: [0.25, 1, 0.7] };

export default defineSkill({
  id: 222,
  name: "Innovation",
  soundOnLanding: true, // with the effect at AttackTime 15 (ZzzCharacter.cpp:5213-5223)
  visual: {
    cast: summonerHand(CURSE_HAND_ENERVATION),
    impact: onCurseLanding(zinCurse(ZIN_ENERVATION)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_ENERVATION), curseHandLight(CURSE_HAND_ENERVATION)), impact: onCurseLanding(seq(zinCurse(ZIN_ENERVATION), zinGrace(ZIN_ENERVATION))) },
  },
  buffs: {
    77: () => ({ boneSparks: { colour: [0.25, 1, 0.7], underlay: true, pins: true } }),
  },
  sound: 'Sound/SE_Ch_summoner_innovation', // Innovation
  delayMs: 4000, // Innovation
  clip: SLEEP_CLIPS, // Enervation
  target: 'inPlace',
});
