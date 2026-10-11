import { defineSkill } from '@/controllers/skills/define';
import { ALICE_SLEEP, AliceCurse, CurseHand, aliceCurse, aliceGrace, curseHandLight, summonerHand } from '../_shared';
import { entityGone, entityPos, type RGB } from '@/controllers/fx/core';
import { Step, onCurseLanding, seq } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { playCombat } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

const BERSERKER: RGB = [1, 0.1, 0.2];
const CURSE_HAND_BERSERKER: CurseHand = { shiny: BERSERKER, pin: BERSERKER, puff: BERSERKER, dark: false };
/**
 * Berserker: everything on the caster. The models take the red Light; subtype 0 hard-codes Sleep's violet
 * accents (MoveHandlers.cpp:2256-2336), so the red rings sit in a violet glow.
 */
const ALICE_BERSERKER: AliceCurse = { ...ALICE_SLEEP, circle: BERSERKER, models: BERSERKER, on: 'self', grace: { light: [0.9, 0.12, 0.6], ember: [1, 0.15, 0.25] } };

/** Berserker.wav again as the rings land (ZzzCharacter.cpp:4716-4723). */
const berserkerWav: Step = (_at, c) => {
  if (!entityGone(c.caster)) playCombat('Sound/Berserker', entityPos(c.caster, 0, new Vector3()));
};

export default defineSkill({
  id: 218,
  name: "Berserker",
  // ReceiveMagicFinish drops eBuff_Berserker (WSclient.cpp:3983-3986).
  effect: 81,
  effectAliases: [469],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [469, 470, 472],
  // 218 Berserker (469 / 470 / 472): the hand in (1,0.1,0.2), then 14 ticks after the reply the circle and the
  // rings on the caster in a violet glow, and the wav again (aliceCurse).
  visual: {
    cast: summonerHand(CURSE_HAND_BERSERKER),
    impact: onCurseLanding(seq(aliceCurse(ALICE_BERSERKER), berserkerWav)),
    enhanced: {
      cast: seq(summonerHand(CURSE_HAND_BERSERKER), curseHandLight(CURSE_HAND_BERSERKER)),
      impact: onCurseLanding(seq(aliceCurse(ALICE_BERSERKER, true), aliceGrace(ALICE_BERSERKER), berserkerWav)),
    },
  },
  buffs: {
    // 0x51 Berserker: hand auroras and body marks.
    81: () => ({ berserk: true }),
  },
  sound: 'Sound/Berserker', // Berserker
  delayMs: 5000, // Berserker
  clip: { ground: A.PLAYER_SKILL_SLEEP }, // Berserker
  target: 'self',
});
