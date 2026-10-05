import { defineSkill } from '@/controllers/skills/define';
import { PARTY_BUFF_CLIPS, ourforcesCast, ourforcesSmoke, partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 266,
  name: "Ignore Defense",
  // ReceiveMagicFinish (WSclient.cpp:3963-3965) drops it; past its BYTE, so ours (skills readme).
  effect: 129,
  // RageCreateEffect at the caster (MonkSystem.cpp:1128-1156): BITMAP_SWORD_EFFECT_MONO sub0, MODEL_WINDFOCE sub0.
  visual: { cast: ourforcesCast({ flash: [0.2, 0.4, 1], wave: [0.4, 0.4, 1], ring: [0.6, 0.65, 1], cloud: [0.65, 0.8, 1], pillar: [0.5, 0.55, 1], magic: [0.5, 0.55, 0.9] }) },
  buffs: {
    // 129: BITMAP_LIGHT_RED sub1, a red smoke off the hands (InsertBuffPhysicalEffect, WSclient.cpp:15662-15666).
    129: ourforcesSmoke,
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  noFlinch: PARTY_BUFF_CLIPS, // SetPlayerShock leaves the buff clips alone (ZzzCharacter.cpp:1283-1297)
  target: 'self',
});
