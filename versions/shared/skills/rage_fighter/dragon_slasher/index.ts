import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityPos, entityYaw } from '@/controllers/fx/core';
import { multiShotVolley } from '../../_shared';
import { seq, slash, steelHit } from '@/controllers/skills/visuals';

import { A } from '@/controllers/combat/recipes';

export default defineSkill({
  id: 265,
  name: "Dragon Slasher",
  // 265 Dragon Slasher (AT_SKILL_DRAGON_KICK): MODEL_DRAGON_KICK_DUMMY (0.7,0.7,1) at the caster plus the
  // MULTI_SHOT1/2/3 volley fired forward, Light (0.8,0.9,1.6).
  visual: {
    cast: seq(
      slash(RGBS.steel, TEX.motionBlur, 1),
      (at, c) => {
        effects.spawn('model', c.scene, entityPos(c.caster, 0.1, new Vector3()), { model: MODEL.dragonKick, seconds: 0.8, colour: [0.7, 0.7, 1], grow: 1.3, yaw: entityYaw(c.caster) });
        multiShotVolley(at, c);
      }
    ),
    impact: steelHit,
  },
  sound: 'Sound/Ragefighter/Rage_Dragonkick', // Dragon Slasher
  delayMs: 3000, // Dragon Slasher
  clip: { ground: A.PLAYER_SKILL_DRAGONKICK }, // Dragon Slasher
});
