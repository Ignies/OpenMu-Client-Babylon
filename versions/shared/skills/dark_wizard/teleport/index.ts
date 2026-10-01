import { defineSkill } from '@/controllers/skills/define';
import { type Entity } from '@/ecs/world';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { baseSkill, contextFor, skillVisualFor } from '@/controllers/skills/visuals';
import { entityPos } from '@/controllers/fx/core';
import { lighting } from '@/controllers/lighting';
import { teleportColumn, teleportEnhanced } from '../_shared';

import { A } from '@/controllers/combat/recipes';

/**
 * The flash of `CreateTeleportBegin` (`moment` begin, the row's `cast`) or
 * `CreateTeleportEnd` (end, the row's `impact`) at the feet of `entity`, as the
 * current tier draws it. The body fade and the sounds are teleportSystem's.
 */
export function playTeleportFlash(scene: Scene, skill: number, entity: Entity, moment: 'begin' | 'end'): void {
  if (!entity.transform) return;
  const row = skillVisualFor(skill);
  const step = moment === 'begin' ? row.cast : row.impact;
  const feet = entityPos(entity, 0, new Vector3());
  step?.(feet, contextFor(scene, entity, null));
  lighting.skillAt(scene, baseSkill(skill), moment === 'begin' ? 'cast' : 'impact', feet);
}

export default defineSkill({
  id: 6,
  name: "Teleport",
  // 6 Teleport: CreateTeleportBegin at the old square (cast) and CreateTeleportEnd at the new one (impact), BITMAP_SPARK+1 each.
  visual: { cast: teleportColumn, impact: teleportColumn, enhanced: { cast: teleportEnhanced('begin'), impact: teleportEnhanced('end') } },
  sound: 'Sound/sMagic', // Teleport (SOUND_MAGIC in CreateTeleportBegin)
  // --- Dark Wizard --------------------------------------------------------
  clip: { ground: A.PLAYER_SKILL_TELEPORT }, // Teleport (SetPlayerTeleport, :6243)
});
