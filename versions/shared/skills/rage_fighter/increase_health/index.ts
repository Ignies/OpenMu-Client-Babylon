import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, partyBuffClip, partyBuffSound, windForce } from '../_shared';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { atCaster, flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 267,
  name: "Increase Health",
  // ReceiveMagicFinish (WSclient.cpp:3966-3969) drops it; past its BYTE, so ours (skills readme).
  effect: 130,
  effectAliases: [573],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [573],
  // RageCreateEffect's MODEL_WINDFOCE sub4 (0.85, 0.2, 1) at the caster (MonkSystem.cpp:1178-1179, MoveHandlers.cpp:9529-9554).
  visual: {
    cast: windForce([0.85, 0.2, 1], false, [0.85, 0.2, 1]),
    impact: flash(TEX.shiny, RGBS.holy, 1.3, 0.6),
    area: atCaster(flash(TEX.shiny, RGBS.holy, 1.3, 0.6), 0.8),
  },
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
