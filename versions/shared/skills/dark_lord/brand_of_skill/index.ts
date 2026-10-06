import { defineSkill } from '@/controllers/skills/define';
import { afterRelease, cm, ticks, type SkillContext } from '@/controllers/skills/visuals';
import { MODEL } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { TICK, WHITE, delay, entityGone, entityPos, fxNow, type RGB } from '@/controllers/fx/core';

import { playCombat } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';
import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND, bodyLight, currentMap } from '../../_shared';
import { cardHands, handCard } from '../_shared';

const f32 = Math.fround;

/** MODEL_MANA_RUNE sub0's BodyLight in both its passes (ZzzObject.cpp:1565-1570). */
const RUNE_LIGHT: RGB = [0.3, 0.6, 1];
/** Its Angle, whatever it was made with (ZzzEffect.cpp:4219). */
const RUNE_ANGLE = [0, 0, 45] as const;

/**
 * MODEL_MANA_RUNE sub0 as drawn after each of its moves 1-49 (it dies on its 50th): LifeTime 50, Scale 0, Gravity 0.1, Alpha 0.3
 * (ZzzEffect.cpp:4209-4220). Over LifeTime 43 it is hidden (HiddenMesh -2), and Scale 0 hides it on to 40; then Scale += Gravity,
 * Gravity += 0.15 until past 1, where it holds, making a sub1 each move it is held there; under 15 Scale -= Gravity, Gravity
 * += 0.2, Alpha = LifeTime / 20 and it sinks 10 cm a move (MoveHandlers.cpp:7003-7036). `ring`: the move makes a sub1.
 */
const RUNE = (() => {
  const out: { scale: number; alpha: number; sunk: number; ring: boolean }[] = [];
  let scale = 0;
  let gravity = f32(0.1);
  let alpha = 0.3;
  let sunk = 0;
  for (let lt = 50; lt > 1; lt--) {
    let ring = false;
    if (lt <= 40 && lt > 30) {
      scale = f32(scale + gravity);
      gravity = f32(gravity + f32(0.15));
      if (scale > 1) {
        scale = 1;
        gravity = f32(0.01);
        ring = true;
      }
    } else if (lt < 15) {
      scale = Math.max(0, f32(scale - gravity));
      gravity = f32(gravity + f32(0.2));
      alpha = lt / 20;
      sunk += 10;
    }
    out.push({ scale: lt > 43 ? 0 : scale, alpha, sunk, ring });
  }
  return out;
})();

/** The draw after the move a spawn `t` seconds old has made: the first runs in the frame it is made. */
const moveAt = (t: number, moves: number): number => Math.min(moves, Math.floor(t / TICK + 1e-6));

/**
 * MODEL_MANA_RUNE sub1 (ZzzEffect.cpp:4221-4229, MoveHandlers.cpp:7038-7045): LifeTime 10, Scale 1.1 less 0.02 a move down to 1,
 * both meshes (the ring plane and the rune) bright (BlendMesh -2) at BlendMeshLight 0.4 of its BodyLight, the terrain light under
 * it plus its maker's Light, the caster's, zero; the Alpha its LifeTime sets dims no BlendMesh draw (ZzzBMD.cpp:2022-2036, :2098).
 */
function ring(c: SkillContext, at: Vector3): void {
  const light = bodyLight(at, [0, 0, 0]);
  effects.spawn('model', c.scene, at, {
    model: MODEL.manaRune,
    seconds: ticks(9),
    angle: RUNE_ANGLE,
    colour: [light[0] * 0.4, light[1] * 0.4, light[2] * 0.4],
    scaleAt: t => Math.max(1, f32(1.1 - 0.02 * (moveAt(t, 9) + 1))),
    life: () => 1,
  });
}

/**
 * MODEL_MANA_RUNE sub0 300 cm over the caster (ZzzCharacter.cpp:4712): mesh 0, the ring plane, hidden (HiddenMesh 0), the rune
 * textured at its Alpha with a RENDER_BRIGHT | RENDER_CHROME pass, both in (0.3, 0.6, 1) (ZzzObject.cpp:1565-1570).
 */
function manaRune(c: SkillContext): void {
  const at = entityPos(c.caster, 0, new Vector3());
  at.y += cm(300);
  const t0 = fxNow();
  const draw = (t: number) => RUNE[moveAt(t, RUNE.length - 1)];
  effects.spawn('model', c.scene, at.clone(), {
    model: MODEL.manaRune,
    seconds: ticks(RUNE.length),
    angle: RUNE_ANGLE,
    colour: RUNE_LIGHT,
    blendMesh: -1,
    solidFade: true,
    hideMesh: 0,
    shine: { mesh: 1, colour: RUNE_LIGHT },
    scaleAt: t => draw(t).scale,
    life: p => draw(p * ticks(RUNE.length)).alpha,
    follow: out => out.set(at.x, at.y - cm(draw(fxNow() - t0).sunk), at.z),
  });
  RUNE.forEach((d, m) => {
    if (d.ring) delay(ticks(m), () => ring(c, new Vector3(at.x, at.y - cm(d.sunk), at.z)));
  });
}

/**
 * At the cast's release (AttackTime 15, ZzzCharacter.cpp:4139-4145), as Add Critical: the MODEL_DARKLORD_SKILL card at each
 * hand in its white Light, at Weapon[0]'s link bone unless it holds arrows and Weapon[1]'s unless it holds bolts or a shield,
 * the mana rune over the caster and SOUND_BCS_BRAND_OF_SKILL, with no object (ZzzCharacter.cpp:4699-4714). Only Battle Castle
 * loads that sound (MapManager.cpp:283): anywhere else the original plays nothing.
 */
const brand = afterRelease((_at, c) => {
  if (entityGone(c.caster)) return;
  for (const hand of cardHands(c.caster, false)) handCard(c.scene, c.caster, hand, WHITE);
  manaRune(c);
  if (currentMap() === ENUM_WORLD.WD_30BATTLECASTLE) playCombat('Sound/battlecastle/sCDarkAssist');
});

export default defineSkill({
  id: 75,
  name: "Brand of Skill",
  // ReceiveMagicFinish drops eBuff_AddSkill (WSclient.cpp:3918-3920).
  effect: 19,
  // 75 Brand of Skill: the hand cards and the mana rune at the release; see brand.
  visual: { impact: brand },
  clip: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Add Skill (Brand of Skill)
});
