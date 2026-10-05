import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, partyBuffClip, partyBuffSound, swordFlash, windForce } from '../_shared';
import { seq } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 266,
  name: "Ignore Defense",
  // ReceiveMagicFinish (WSclient.cpp:3963-3965) drops it; past its BYTE, so ours (skills readme).
  effect: 129,
  // RageCreateEffect at the caster (MonkSystem.cpp:1128-1156): BITMAP_SWORD_EFFECT_MONO sub0 and MODEL_WINDFOCE sub0.
  visual: { cast: seq(swordFlash([0.2, 0.4, 1], [0.4, 0.4, 1]), windForce([0.5, 0.55, 1], false, [0.5, 0.55, 1])) },
  buffs: {
    // 129-131 Ourforces (Rage Fighter): the red glow on 17 bones; 153-155 their power-ups.
    129: () => ({ boneGlow: OURFORCES_GLOW }),
    153: () => ({ boneGlow: OURFORCES_GLOW }),
  },
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  noFlinch: PARTY_BUFF_CLIPS, // SetPlayerShock leaves the buff clips alone (ZzzCharacter.cpp:1283-1297)
  target: 'self',
});
