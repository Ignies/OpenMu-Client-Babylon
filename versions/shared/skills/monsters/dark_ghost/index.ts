import { defineMonsterSkill, type MonsterSkillLook } from '@/controllers/skills';
import { NO_MONSTER_SKILL, monsterAttackState } from '@/controllers/anim/monsterAttackClip';
import { ENUM_WORLD as W } from '@/core/types';
import { delay, entityPos } from '@/controllers/fx/core';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { playCombat } from '@/controllers/sound/combat';
import { MonsterActionType as A } from '@versions/shared/objects/enum';
import { TICK, cm, ticks } from '@/controllers/skills/visuals';
import { EFFECT_LUMINOSITY } from '@/controllers/lighting/skills';
import { dropMeteor } from '../../dark_wizard/meteorite';

/** BITMAP_FLAME sub0: LT 40, six tongues within 25 cm and a (1, 0.4, 0) floor light in range 3 every tick (MoveHandlers.cpp:1802-1822). */
const FLAME_TICKS = 40;
const FLAME_LIGHT = { color: [1, 0.4, 0] as [number, number, number], range: 3, seconds: FLAME_TICKS * TICK, release: TICK, flicker: EFFECT_LUMINOSITY };
/** 52 rains MODEL_FIRE within 512 cm of it on every AttackTime tick, 1 to 14. */
const RAIN_TICKS = 14;
const RAIN_RANGE = cm(512);

/**
 * GMEmpireGuardian2::AttackEffectMonster (GMEmpireGuardian2.cpp:1159-1190), on each swing: in Attack1 a MODEL_FIRE on
 * its target with SOUND_METEORITE01, spending the skill; with 51 kept a BITMAP_FLAME on the target and SOUND_FLAME,
 * spending it; with 52 kept a MODEL_FIRE dropped round it and SOUND_METEORITE01 every AttackTime tick. 52 is never
 * spent there, so its later plain swings rain too, as in the original.
 */
const attack: MonsterSkillLook = c => {
  const state = monsterAttackState(c.caster);
  const target = c.target?.transform ? entityPos(c.target, 0, new Vector3()) : null;
  if (c.caster.monsterAnimation?.action === A.Attack1) {
    if (!target) return;
    dropMeteor(target, c);
    playCombat('Sound/eMeteorite');
    state.monsterSkill = NO_MONSTER_SKILL;
  } else if (state.monsterSkill === 51) {
    if (!target) return;
    effects.spawn('column', c.scene, target, { seconds: ticks(FLAME_TICKS), radius: cm(25) });
    lighting.flash(c.scene, FLAME_LIGHT, { position: target });
    playCombat('Sound/sFlame');
    state.monsterSkill = NO_MONSTER_SKILL;
  } else if (state.monsterSkill === 52) {
    const at = entityPos(c.caster, 0, new Vector3());
    for (let n = 0; n < RAIN_TICKS; n++) {
      delay(n * TICK, () => {
        const p = new Vector3(at.x + (Math.random() * 2 - 1) * RAIN_RANGE, at.y, at.z + (Math.random() * 2 - 1) * RAIN_RANGE);
        dropMeteor(p, c);
        playCombat('Sound/eMeteorite');
      });
    }
  }
};

export default defineMonsterSkill({
  name: 'Dark Ghost',
  monsters: [515],
  worlds: [W.WD_70EMPIREGUARDIAN2],
  attack,
});
