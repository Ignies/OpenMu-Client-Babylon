import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import { eachClipTick, multiShotVolley } from '../../_shared';
import { IMPACT_HEIGHT, slash, steelHit, type Step } from '@/controllers/skills/visuals';
import { playCombat } from '@/controllers/sound';

import { A } from '@/controllers/combat/recipes';

/** MODEL_DRAGON_KICK_DUMMY's LifeTime (ZzzEffect.cpp:6131-6139): it also dies when the caster leaves DRAGONKICK. */
const DUMMY_TICKS = 200;

/**
 * At the packet: the dummy (0.7, 0.7, 1) at the caster and the MULTI_SHOT1/2/3 volley fired forward
 * (MonkSystem.cpp:1215-1260). Each tick the dummy lives (MoveHandlers.cpp:9826-9915): past key 5 the burst on the
 * target, past key 8 Rage_Dragonkick_Att (LifeTime = 150 then == 150, so every tick). Leaving the clip ends it all.
 */
const dragonKick: Step = (at, c) => {
  slash(RGBS.steel, TEX.motionBlur, 1)(at, c);
  let over = false;
  effects.spawn('model', c.scene, entityPos(c.caster, 0.1, new Vector3()), { model: MODEL.dragonKick, seconds: 0.8, colour: [0.7, 0.7, 1], grow: 1.3, yaw: entityYaw(c.caster), until: () => over });
  multiShotVolley(at, c);
  const target = c.target;
  eachClipTick(c, A.PLAYER_SKILL_DRAGONKICK, DUMMY_TICKS, frame => {
    // m_sTargetIndex < 0 returns before the burst and the sound.
    if (!target || entityGone(target)) return;
    if (frame > 5) steelHit(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
    const p = c.caster.transform?.pos;
    if (frame > 8 && p) playCombat('Sound/Ragefighter/Rage_Dragonkick_Att', { x: p.x, z: p.z });
  }, () => {
    over = true;
  });
};

export default defineSkill({
  id: 265,
  name: "Dragon Slasher",
  // 265 Dragon Slasher (AT_SKILL_DRAGON_KICK): the dummy, the volley and the per-tick burst; see dragonKick.
  visual: { cast: dragonKick },
  sound: 'Sound/Ragefighter/Rage_Dragonkick', // Dragon Slasher
  delayMs: 3000, // Dragon Slasher
  clip: { ground: A.PLAYER_SKILL_DRAGONKICK }, // Dragon Slasher
  stepIn: 'midClip',
});
