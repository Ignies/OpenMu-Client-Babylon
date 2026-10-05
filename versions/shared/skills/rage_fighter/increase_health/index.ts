import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, ourforcesCast, partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 267,
  name: "Increase Health",
  // ReceiveMagicFinish (WSclient.cpp:3966-3969) drops it; past its BYTE, so ours (skills readme).
  effect: 130,
  effectAliases: [573],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [573],
  // RageCreateEffect at the caster (MonkSystem.cpp:1157-1184): BITMAP_SWORD_EFFECT_MONO sub1, MODEL_WINDFOCE sub4.
  visual: { cast: ourforcesCast({ flash: [0.5, 0.28, 1], wave: [0.7, 0.5, 1], cloud: [0.8, 0.4, 1], pillar: [0.85, 0.2, 1], magic: [0.78, 0.2, 1] }) },
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
