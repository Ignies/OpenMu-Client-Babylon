import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, partyBuffClip, partyBuffSound, swordFlash, windForce } from '../_shared';
import { seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 267,
  name: "Increase Health",
  // ReceiveMagicFinish (WSclient.cpp:3966-3969) drops it; past its BYTE, so ours (skills readme).
  effect: 130,
  effectAliases: [573],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [573],
  // RageCreateEffect at the caster (MonkSystem.cpp:1157-1184): BITMAP_SWORD_EFFECT_MONO sub1 and MODEL_WINDFOCE sub4.
  visual: { cast: seq(swordFlash([0.5, 0.28, 1], [0.7, 0.5, 1]), windForce([0.85, 0.2, 1], false, [0.85, 0.2, 1])) },
  buffs: {
    130: () => ({ boneGlow: OURFORCES_GLOW }),
    154: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_2', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  noFlinch: PARTY_BUFF_CLIPS,
  target: 'self',
});
