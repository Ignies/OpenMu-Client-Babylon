import { defineSkill } from '@/controllers/skills/define';
import { FIRE_PUFF, MODEL, RGBS } from '@/controllers/fx/recipes';
import { atCaster, flying, particles, perTick, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { delay, entityGone, entityPos, entityYaw, fxNow } from '@/controllers/fx/core';
import { RELEASE_TICKS } from '@/controllers/combat';
import { playCombat } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';
import { currentMap, multiShotVolley, streamerFan } from '../../_shared';
import { Vector3 } from '@/controllers/render/babylon/exports';

import { A } from '@/controllers/combat/recipes';

/** The charge's sparks and fire at the caster, every tick (the BITMAP_FIRE sub18 spray stands in as streamers). */
const spray: Step = atCaster(streamerFan(4, 0.35, { velocity: perTick(40), seconds: ticks(8), maxTails: 4, width: 0.15, colour: RGBS.fire, pitch: -0.9 }), 0.2);

/**
 * The release block (ZzzCharacter.cpp:4690-4695): MODEL_SWORD_FORCE sub2 at the caster and SOUND_BCS_RUSH, a wave
 * loaded only in Battle Castle (MapManager.cpp:277).
 */
function swordForce(c: SkillContext): void {
  const at = entityPos(c.caster, 1, new Vector3());
  effects.spawn('model', c.scene, at, { model: MODEL.swordForce, seconds: ticks(15), scale: 1, colour: RGBS.fire, grow: 3, follow: flying(c, 1, perTick(10)), yaw: entityYaw(c.caster) });
  particles({ recipe: FIRE_PUFF, count: 8 })(at, c);
  const p = c.caster.transform?.pos;
  if (p && currentMap() === ENUM_WORLD.WD_30BATTLECASTLE) playCombat('Sound/battlecastle/sCHaveyBlow', { x: p.x, z: p.z });
}

/**
 * AttackStage's AT_SKILL_RUSH / AT_SKILL_OCCUPY case (ZzzCharacter.cpp:2934-2959): from tick 1 the spray each tick,
 * until RUSH passes key 5 or AttackTime reaches 15 by itself (tick 14); that tick the sword force leaves. The hero's
 * own cast also fires the MULTI_SHOT volley (MonkSystem.cpp:1305-1333, SkillCast.cpp:776-832); others never see it.
 */
const charge: Step = (at, c) => {
  if (c.caster.localPlayer) multiShotVolley(at, c);
  const t0 = fxNow();
  let n = 0;
  const tick = (): void => {
    n++;
    if (entityGone(c.caster)) return;
    spray(at, c);
    const m = c.caster.modelObject;
    if ((m?.CurrentAction === A.PLAYER_ATTACK_RUSH && m.actionFrame() > 5) || n >= RELEASE_TICKS) {
      swordForce(c);
      return;
    }
    delay(t0 + ticks(n + 1) - fxNow(), tick);
  };
  delay(ticks(1), tick);
};

export default defineSkill({
  id: 269,
  name: "Charge",
  // 269 Occupy (Charge): Rush's charge with BITMAP_FIRE sub18, then MODEL_SWORD_FORCE sub2; see charge.
  visual: { cast: charge },
  sound: 'Sound/sKnightSkill2', // Occupy: SOUND_SKILL_SWORD2 at the packet (WSclient.cpp:5123-5129)
  clip: { ground: A.PLAYER_ATTACK_RUSH }, // Occupy (WSclient.cpp:4725)
  stepIn: 'cast',
});
