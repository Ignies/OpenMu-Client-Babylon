import { AreaSkillAnimationPacket, ChainLightningHitInfoPacket, MagicEffectCancelledPacket, MagicEffectStatusPacket, SkillAddedPacket, SkillListUpdatePacket, SkillRemovedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { teleportCastSound } from '@/controllers/sound';
import { Entity, World } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { cancelledEffects } from '@/controllers/skills';
import { Store } from '@/app/store';
import { Hero } from '@/modules/hero';
import { Ecs } from '@/ecs/current';
import { TELEPORT } from './skillCasting';
import { applyObjectEffect, playCastAnimation } from '../_shared/net_helpers';
import { beginTeleport, endTeleport, justArrived } from '@/ecs/systems/teleportSystem';
import { playAreaSkillVisual, playChainLightningHop } from '@versions/shared/skills/skillVisuals';

/**
 * F3 11 carries three shapes behind one sub-code: the full list, and the
 * add/remove notifications flagged by count 0xFE / 0xFF (OpenMU
 * SkillListUpdate / SkillAdded / SkillRemoved). The dispatcher may pick any
 * of the three names for a 10-byte packet, so all route here.
 */
function applySkillListPacket(packet: DataView) {
  const flag = packet.getUint8(4);
  if (flag === 0xfe) {
    const p = new SkillAddedPacket(packet);
    Store.addSkill({ index: p.SkillIndex, number: p.SkillNumber, level: p.SkillLevel });
  } else if (flag === 0xff) {
    const p = new SkillRemovedPacket(packet);
    Store.removeSkill(p.SkillNumber);
  } else {
    const p = new SkillListUpdatePacket(packet);
    Store.setSkillList(
      p.getSkills().map(s => ({
        index: s.SkillIndex,
        number: s.SkillNumber,
        level: s.SkillLevel,
      }))
    );
  }
}

/**
 * Teleport (6) and Teleport Ally (15) as `ReceiveMagic` draws them
 * (WSclient.cpp:4312-4331), fitted to what OpenMU sends: skill 6 from the
 * teleporting player to observers as he leaves, and skill 15 cast by a player
 * on himself both when Teleport Ally pulls him and when he re-enters scope on
 * the new square (ObjectMovedPlugIn.cs:60-63).
 */
export function playTeleportAnimation(world: World, skill: number, caster: Entity, target: Entity | null) {
  if (skill === TELEPORT) {
    // The hero's own Begin played at the click.
    if (caster.localPlayer) return;
    if (caster.monsterAnimation) {
      // A monster's own teleport on its map (the Nightmare in Kanturu 3rd, `so->Type ==
      // MODEL_DARK_SKULL_SOLDIER_5`, WSclient.cpp:4319-4327); anyone else plays the plain one.
      const own = teleportCastSound(world.mapIndex, caster.npcType ?? -1, skill);
      beginTeleport(caster, skill, { clip: false, soundKey: own?.key });
      return;
    }
    beginTeleport(caster, skill);
    return;
  }

  // Teleport Ally: `CreateTeleportBegin(to)` + `CreateTeleportEnd(so)`.
  if (target && target !== caster) {
    beginTeleport(target, skill);
    endTeleport(caster, skill, { telekinesis: true });
    return;
  }
  // A self cast. The hero only gets one when an ally pulls him: he fades out
  // and the server's MapChanged lands him. Anyone else either arrives (re-added
  // a moment ago: both halves on him, as the original's pair on one body) or
  // is being pulled away.
  if (!caster.localPlayer && justArrived(caster)) {
    endTeleport(caster, skill, { magicSounds: 2, flashes: 2, telekinesis: true });
  } else {
    beginTeleport(caster, skill);
  }
}

/** The object (not `except`) standing nearest to tile (x, y), within a tile of it. */
function objectOnTile(world: World, except: Entity, x: number, y: number): Entity | null {
  let best: Entity | null = null;
  let bestD = 1.5 * 1.5;
  for (const e of world.netObjsQuery.entities) {
    if (e === except || !e.transform || e.dying) continue;
    const dx = e.transform.pos.x - x;
    const dz = e.transform.pos.z - y;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function setObjectEffect(objectId: number, effectId: number, active: boolean) {
  const world = Ecs.world;
  if (!world) return;
  const maskedId = objectId & 0x7fff;
  if (maskedId === Hero.playerId) Store.setBuff(effectId, active);
  const obj = world.getByNetId(maskedId);
  if (obj) applyObjectEffect(obj, effectId, active);
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('AreaSkillAnimation', packet => {
    const p = new AreaSkillAnimationPacket(packet);
    const world = Ecs.world;
    if (!world) return;
    const casterId = p.PlayerId & 0x7fff;
    const caster = world.getByNetId(casterId);
    if (!caster) return;

    if (!caster.localPlayer) {
      // Rotation byte: Angle / 360 * 256 of the caster's yaw.
      caster.transform.rot.y = (p.Rotation / 256) * Math.PI * 2;
    }
    playCastAnimation(caster, p.SkillId, true);
    playAreaSkillVisual(
      world.scene,
      p.SkillId,
      caster,
      { x: p.PointX, y: p.PointY },
      (x, y) => world.getTerrainHeight(x, y),
      objectOnTile(world, caster, p.PointX, p.PointY)
    );
  });

  EventBus.on('MagicEffectStatus', packet => {
    const p = new MagicEffectStatusPacket(packet);
    setObjectEffect(p.PlayerId, p.EffectId, p.IsActive);
  });

  EventBus.on('MagicEffectCancelled', packet => {
    const p = new MagicEffectCancelledPacket(packet);
    const world = Ecs.world;
    if (!world) return;
    // The skill's cancel hook (201/202 break a monster's barrier) runs first, then its effect drops.
    const target = world.getByNetId(p.TargetId & 0x7fff) ?? null;
    for (const e of cancelledEffects(p.SkillId, world.scene, target)) setObjectEffect(p.TargetId, e, false);
  });

  EventBus.on('SkillListUpdate', applySkillListPacket);

  EventBus.on('SkillAdded', applySkillListPacket);

  EventBus.on('SkillRemoved', applySkillListPacket);

  /**
   * BF 0A - `ChainLightningHitInfo`: the server-picked hops of Chain Lightning
   * (skill 215). The cast came through the usual skill animation packet; here
   * the arcs are drawn caster -> target -> target, hop `i` from the previous
   * body, as ReceiveChainMagic's MODEL_CHAIN_LIGHTNING sub `i` (WSclient.cpp:5577-5629).
   */
  EventBus.on('ChainLightningHitInfo', packet => {
    const p = new ChainLightningHitInfoPacket(packet);
    const world = Ecs.world;
    if (!world) return;
    let from = world.getByNetId(p.PlayerId & 0x7fff);
    if (!from) return;
    const maxTargets = Math.max(0, Math.floor((packet.byteLength - 10) / 2));
    let hop = 0;
    for (const t of p.getTargets(Math.min(p.TargetCount, maxTargets))) {
      const target = world.getByNetId(t.TargetId & 0x7fff);
      if (target) {
        playChainLightningHop(world.scene, p.SkillNumber, from, target, hop);
        from = target;
      }
      hop++;
    }
  });
}
