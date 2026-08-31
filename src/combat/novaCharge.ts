/**
 * Nova's held charge (`Attack()` ZzzInterface.cpp:6696-6770, `AttackWizard`
 * :5777-5850): pressing the right button with Nova selected sends
 * `AT_SKILL_NOVA_BEGIN` (58) on the hero and plays PLAYER_SKILL_HELL_BEGIN;
 * the button is then held (`MouseRButtonPress++` every frame) and the
 * release — or a left click, `SkillKeyPush` — sends `AT_SKILL_NOVA` (40) at
 * the selected target and plays PLAYER_SKILL_HELL_START. The server scales
 * the damage by how long the charge was held (`SkillStageUpdate`).
 *
 * Driven by `skillCastSystem` (`beginNova` / `releaseNova`); read by it and
 * by the HUD / lighting that want the charge strength.
 */
import type { ENUM_WORLD } from '../common/types';
import { SkillStageUpdatePacket } from '../common/packets/ServerToClientPackets';
import { EventBus } from '../libs/eventBus';
import type { CombatLayer } from './layer';
import { SKILL_NOVA } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/**
 * Seconds of holding for a full charge. The server reports up to 12 stages
 * (`SkillStageUpdate`) and the original's `m_bySkillCount` climbs one per
 * `AttackTime % 5 == 1` — five ticks (0.2 s) per stage → 2.4 s to the top.
 */
const FULL_CHARGE_SECONDS = 2.4;

/** Stages the server counts; the reader exposes the fraction, this the step count. */
const CHARGE_STAGES = 12;

// ---- 2. state + readers ----------------------------------------------------

let charging = false;
let held = 0;
/**
 * `o->m_bySkillCount` of every caster in scope (`ReceiveSkillCount`, 0xBA):
 * the server's stage of a Nova being charged by another player, by net id.
 */
const remoteStages = new Map<number, number>();

/** The server-reported Nova stage (0…12) of a caster in scope; 0 when none. */
export function novaStageOf(netId: number): number {
  return remoteStages.get(netId & 0x7fff) ?? 0;
}

/** The right button is down on a Nova charge. */
export function novaCharging(): boolean {
  return charging;
}

/** How full the charge is, 0…1. */
export function novaCharge(): number {
  return Math.min(1, held / FULL_CHARGE_SECONDS);
}

/** The charge as the server's stage count, 0…12. */
export function novaStage(): number {
  return Math.min(CHARGE_STAGES, Math.floor(novaCharge() * CHARGE_STAGES));
}

/**
 * Command: the right button went down with Nova selected. Returns `false`
 * when a charge is already running (nothing to send).
 */
export function beginNova(): boolean {
  if (charging) return false;
  charging = true;
  held = 0;
  return true;
}

/**
 * Command: the button came up (or the left button was clicked). Returns
 * the seconds held, or `-1` when no charge was running (nothing to send).
 */
export function releaseNova(): number {
  if (!charging) return -1;
  charging = false;
  const seconds = held;
  held = 0;
  return seconds;
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (charging) held += dt;
}

function reset(): void {
  charging = false;
  held = 0;
  remoteStages.clear();
}

// `ReceiveSkillCount`: only AT_SKILL_NOVA carries a count; NOVA_BEGIN is
// ignored by the original too.
EventBus.on('SkillStageUpdate', packet => {
  if (packet.byteLength < SkillStageUpdatePacket.Length!) return;
  const p = new SkillStageUpdatePacket(packet);
  if (p.SkillNumber !== SKILL_NOVA) return;
  const netId = p.ObjectId & 0x7fff;
  if (p.Stage <= 0) remoteStages.delete(netId);
  else remoteStages.set(netId, Math.min(CHARGE_STAGES, p.Stage));
});

// ---- 3. the layer ----------------------------------------------------------

export const novaChargeLayer: CombatLayer = {
  name: 'novaCharge',
  update,
  reset,
};
