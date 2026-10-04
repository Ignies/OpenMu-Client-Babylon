import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { after, fireHit, model, scatter, seq, shockRing, ticks, type Step } from '@/controllers/skills/visuals';
import { whenClipKey } from '../../_shared';

import { A } from '@/controllers/combat/recipes';

/** BITMAP_LAVA's LifeTime (ZzzEffect.cpp:6141-6147); it dies once the caster leaves DRAGONLORE. */
const LAVA_TICKS = 999;

/**
 * At the packet BITMAP_LAVA and MODEL_BLOW_OF_DESTRUCTION sub2 (MonkSystem.cpp:1262-1280). The blow's LifeTime 50
 * reaches 30 on tick 21 and lets the dragon out (MoveHandlers.cpp:7638-7666); the lava sends the fire ring once the
 * caster's DRAGONLORE passes key 5, and nothing if the clip is left first (:9922-9945). The scattered fire stands
 * in for the per-tick fire column that starts there.
 */
const dragonRoar: Step = (at, c) => {
  after(ticks(21), model({ model: MODEL.dragonHead, seconds: 1, colour: RGBS.fire, grow: 1.5, scale: 1.5 }))(at, c);
  whenClipKey(A.PLAYER_SKILL_DRAGONLORE, 5.001, LAVA_TICKS, seq(shockRing(RGBS.fire, 5), scatter(fireHit, 5, 2, 0.05)), false, 'drop')(at, c);
};

export default defineSkill({
  id: 264,
  name: "Dragon Roar",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [560],
  noFlinch: [A.PLAYER_SKILL_DRAGONLORE], // SetPlayerShock leaves the roar alone (ZzzCharacter.cpp:1283-1297)
  visual: { area: dragonRoar },
  sound: 'Sound/Ragefighter/Rage_Dragonlower', // Dragon Roar
  delayMs: 700, // Dragon Roar
  clip: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar
});
