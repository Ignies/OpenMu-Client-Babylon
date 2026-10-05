import { defineSkill } from '@/controllers/skills/define';
import { afterRelease, atCaster, model, ticks } from '@/controllers/skills/visuals';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { WHITE, entityGone } from '@/controllers/fx/core';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_HAND } from '../../_shared';
import { cardHands, handCard } from '../_shared';

/** MODEL_MANA_RUNE sub0 300 cm over the caster (LT 50, Scale 0 up, Alpha 0.3, Angle (0, 0, 45)). */
const manaRune = atCaster(model({ model: MODEL.manaRune, seconds: ticks(50), scale: 0.2, grow: 5, colour: RGBS.gold, alpha: 0.3, yaw: Math.PI / 4 }), 3);

/**
 * At the cast's release (AttackTime 15, ZzzCharacter.cpp:4139-4145), as Add Critical: the MODEL_DARKLORD_SKILL card at each
 * hand in its white Light, at Weapon[0]'s link bone unless it holds arrows and Weapon[1]'s unless it holds bolts or a shield,
 * and the mana rune over the caster (ZzzCharacter.cpp:4699-4714).
 */
const brand = afterRelease((at, c) => {
  if (entityGone(c.caster)) return;
  for (const hand of cardHands(c.caster, false)) handCard(c.scene, c.caster, hand, WHITE);
  manaRune(at, c);
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
