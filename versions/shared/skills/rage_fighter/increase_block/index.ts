import { defineSkill } from '@/controllers/skills/define';
import { OURFORCES_GLOW, PARTY_BUFF_CLIPS, partyBuffClip, partyBuffSound, windForce } from '../_shared';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { atCaster, flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 268,
  name: "Increase Block",
  // ReceiveMagicFinish (WSclient.cpp:3970-3973) drops it; past its BYTE, so ours (skills readme).
  effect: 131,
  effectAliases: [569, 572],
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [569, 572],
  // RageCreateEffect's MODEL_WINDFOCE sub5 (1, 0.2, 0) at the caster (MonkSystem.cpp:1208-1209, MoveHandlers.cpp:9529-9554).
  visual: {
    cast: windForce([1, 0.2, 0], false, [1, 0.2, 0]),
    impact: flash(TEX.shiny, RGBS.steel, 1.3, 0.6),
    area: atCaster(flash(TEX.shiny, RGBS.steel, 1.3, 0.6), 0.8),
  },
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
