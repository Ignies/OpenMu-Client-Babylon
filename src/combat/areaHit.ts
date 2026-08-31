/**
 * The `AreaSkillHit` (0xDB, `PACKET_MAGIC_ATTACK`) follow-up: for a skill
 * whose hits the *client* decides, an `AreaSkill` cast is followed by one
 * 0xDB carrying the targets inside the area — up to the packet's byte cap —
 * and a per-cast `HitCounter` / `AnimationCounter` the server uses to drop
 * duplicates. OpenMU processes it only for skills typed
 * `AreaSkillExplicitHits`; for `AreaSkillAutomaticHits` the server picks
 * the targets itself and the packet must *not* be sent, so the gate is the
 * skill's type (data) plus an explicit override set.
 *
 * Driven by `skillCastSystem` (`areaHitTargets` → `buildAreaHit`); this
 * entry keeps the counters and the area rule, never sends.
 */
import { AreaSkillHitPacket } from '../common/packets/ClientToServerPackets';
import type { SkillDefinition } from '../common/skillsDatabase';
import type { ENUM_WORLD } from '../common/types';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** OpenMU's skill type whose hits are sent by the client. */
const EXPLICIT_HITS_TYPE = 'AreaSkillExplicitHits';

/**
 * Skills that send 0xDB whatever their database type says. Empty by
 * default: this data copy types every area skill as automatic hits. Add a
 * skill number here to force the follow-up for it.
 */
const EXPLICIT_HIT_SKILLS: ReadonlySet<number> = new Set<number>([]);

/**
 * Tiles around the cast point a target counts as inside when the skill
 * carries no `range` of its own. Twisting Slash / Rageful Blow reach the
 * 8-neighbourhood: √2 ≈ 1.5 rounded up to the tile ring.
 */
const DEFAULT_AREA_TILES = 1.5;

/** Targets per packet: 0xDB is a C3 with a one-byte length; 3 bytes per target. */
const MAX_TARGETS = 20;

/** Bytes before the target list: header 3 + skill 2 + x, y, hitCounter, count. */
const HEADER_BYTES = 9;
const BYTES_PER_TARGET = 3;

// ---- 2. state + readers ----------------------------------------------------

/** `HitCounter`: increments per cast so the server can drop replays. */
let hitCounter = 0;

/** `AnimationCounter`: increments per packet, wraps at a byte. */
let animationCounter = 0;

/** Whether this skill wants the client to name its hits. */
export function needsAreaHit(def: SkillDefinition): boolean {
  return (
    (def.type as string) === EXPLICIT_HITS_TYPE ||
    EXPLICIT_HIT_SKILLS.has(def.num)
  );
}

/** Reach of the area around the cast point, in tiles. */
export function areaHitRadius(def: SkillDefinition): number {
  return def.range > 0 ? def.range + 0.5 : DEFAULT_AREA_TILES;
}

/**
 * Command: build the 0xDB for a cast at (x, y) on these targets. Bumps the
 * counters. Returns `null` when there is nothing to hit.
 */
export function buildAreaHit(
  skill: number,
  x: number,
  y: number,
  targetIds: readonly number[]
): AreaSkillHitPacket | null {
  if (targetIds.length === 0) return null;
  const ids = targetIds.slice(0, MAX_TARGETS);
  hitCounter = (hitCounter + 1) & 0xff;
  animationCounter = (animationCounter + 1) & 0xff;

  const size = HEADER_BYTES + ids.length * BYTES_PER_TARGET;
  const packet = AreaSkillHitPacket.createPacket(size);
  packet.SkillId = skill;
  packet.TargetX = x;
  packet.TargetY = y;
  packet.HitCounter = hitCounter;
  packet.TargetCount = ids.length;
  const view = packet.buffer;
  for (let i = 0; i < ids.length; i++) {
    const at = HEADER_BYTES + i * BYTES_PER_TARGET;
    view.setUint16(at, ids[i], false);
    view.setUint8(at + 2, animationCounter);
  }
  packet.writeLength(size);
  return packet;
}

function update(_map: ENUM_WORLD, _dt: number): void {
  // Counters only move on a cast; nothing to step.
}

function reset(): void {
  hitCounter = 0;
  animationCounter = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const areaHitLayer: CombatLayer = {
  name: 'areaHit',
  update,
  reset,
};
