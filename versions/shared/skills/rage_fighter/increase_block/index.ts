import { defineSkill } from '@/controllers/skills/define';
import { PARTY_BUFF_CLIPS, ourforcesCast, ourforcesMirror, partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 268,
  name: "Increase Block",
  // ReceiveMagicFinish (WSclient.cpp:3970-3973) drops it; past its BYTE, so ours (skills readme).
  effect: 131,
  effectAliases: [569, 572],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [569, 572],
  // RageCreateEffect at the caster (MonkSystem.cpp:1185-1214): BITMAP_SWORD_EFFECT_MONO sub2, MODEL_WINDFOCE sub5.
  visual: { cast: ourforcesCast({ flash: [1, 0.15, 0], wave: [1, 0.12, 0], ring: [1, 0.1, 0], cloud: [1, 0.3, 0.2], pillar: [1, 0.2, 0], magic: [1, 0.15, 0] }) },
  buffs: {
    // 131 (153, 154 its power-up and mastery): BITMAP_LIGHT_RED sub2, a mirror wind pillar now and then (WSclient.cpp:15674-15678).
    131: ourforcesMirror,
    153: ourforcesMirror,
    154: ourforcesMirror,
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  noFlinch: PARTY_BUFF_CLIPS,
  target: 'self',
});
