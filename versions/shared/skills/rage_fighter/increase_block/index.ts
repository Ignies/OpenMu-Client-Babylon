import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, partyBuffClip, partyBuffSound, swordFlash, windForce } from '../_shared';
import { seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 268,
  name: "Increase Block",
  // ReceiveMagicFinish (WSclient.cpp:3970-3973) drops it; past its BYTE, so ours (skills readme).
  effect: 131,
  effectAliases: [569, 572],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [569, 572],
  // RageCreateEffect at the caster (MonkSystem.cpp:1185-1214): BITMAP_SWORD_EFFECT_MONO sub2 and MODEL_WINDFOCE sub5.
  visual: { cast: seq(swordFlash([1, 0.15, 0], [1, 0.12, 0]), windForce([1, 0.2, 0], false, [1, 0.2, 0])) },
  buffs: {
    131: () => ({ boneGlow: OURFORCES_GLOW }),
    155: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  noFlinch: PARTY_BUFF_CLIPS,
  target: 'self',
});
