import { BaseClass, getBaseClass } from '../hero/characterStats';
import { COMBAT_BUS, hitSound, usesMissileWeapon } from '@/controllers/sound/combatSounds';
import { playSkill } from '@/controllers/sound';
import { Entity, World } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { type MUAttributeSystem } from '@/core/attributeSystem';
import { MonsterActionType, PlayerAction, ServerPlayerActionType } from '@versions/shared/objects/enum';
import { ObjectAnimationPacket, ObjectGotKilledPacket, ObjectHitExtendedPacket, ObjectHitPacket, RageAttackPacket, RageAttackRangeResponsePacket, SkillAnimationPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ServerToClientActionMap, resolveGenderedAction } from '@/controllers/anim/playerActionMapper';
import { Hero } from '@/modules/hero';
import { Ecs } from '@/ecs/current';
import { attackInputOf, attackPoseOf, monsterNumberOf, playCastAnimation, playTrapSounds, setMonsterClip } from './clips';
import { isDeadMonster } from '../scope/objects';
import { convertDirectionToAngle } from '@/core/turnAngle';
import { chooseAttackAction, isWeaponItem } from '@/controllers/actors/weaponClass';
import { combat } from '@/controllers/combat';
import { delay } from '@/controllers/fx/core';
import { isMonsterSwingClip, monsterAttackState, monsterFlinches, monsterSwing } from '@/controllers/anim/monsterAttackClip';
import { isPlayerBody } from '@/controllers/actors/playerObject';
import { isTeleportSkill } from '../skills/skillCasting';
import { meteoriteStormRunning, santaActionSound } from '@/controllers/sound/packetSounds';
import { mountKind } from '@/controllers/pets';
import { afterHeroRelease, playBowShotVisual, playBuffHits, playTargetedSkillVisual } from '@versions/shared/skills/skillVisuals';
import { playSfx } from '@/controllers/sound/sfx';
import { playTeleportAnimation } from '../skills/net';
import { playerPlaySpeed } from '@/controllers/anim/playSpeed';
import { runInAction } from 'mobx';
import { heldWeapons } from '@/controllers/actors';
import { serverSetting } from '../servers/serverManifest';

/** `SetAction_Fenrir_Damage` (ZzzAI.cpp:283-311): the rider's flinch, by what is in hand. */
function fenrirDamageAction(obj: Entity): PlayerAction {
  const hands = obj.charAppearance;
  const main = isWeaponItem(hands?.leftHand ?? null);
  const off = isWeaponItem(hands?.rightHand ?? null);
  const A = PlayerAction;
  if (getBaseClass(hands?.charClass ?? Hero.charClass) === BaseClass.RageFighter) {
    if (main && off) return A.PLAYER_RAGE_FENRIR_DAMAGE_TWO_SWORD;
    if (main) return A.PLAYER_RAGE_FENRIR_DAMAGE_ONE_RIGHT;
    if (off) return A.PLAYER_RAGE_FENRIR_DAMAGE_ONE_LEFT;
    return A.PLAYER_RAGE_FENRIR_DAMAGE;
  }
  if (main && off) return A.PLAYER_FENRIR_DAMAGE_TWO_SWORD;
  if (main) return A.PLAYER_FENRIR_DAMAGE_ONE_RIGHT;
  if (off) return A.PLAYER_FENRIR_DAMAGE_ONE_LEFT;
  return A.PLAYER_FENRIR_DAMAGE;
}

function markKilled(
  world: World,
  obj: Entity,
  killedByHero: boolean,
  skill: number,
  killerNetId: number
) {
  if (obj.dying) return;
  world.addComponent(obj, 'dying', {
    time: 0,
    started: false,
    rot: 0,
    alpha: 1,
    sink: 0,
    killedByHero,
    // A plain blow's request went out on the blow when the server asks for that (server.json).
    held: killedByHero && skill === 0 && serverSetting('heldHitRequest') ? combat.blowHeldTicks : 0,
    skill,
    killerNetId,
    shattered: false,
    offset: { x: 0, y: 0, z: 0 },
    pitch: 0,
  });
}

function stopNetObjectAtTarget(obj: Entity) {
  const { pathfinding, playerMoveTo, movement, transform } = obj;

  const pendingMove = playerMoveTo && !playerMoveTo.handled;
  const walking = pendingMove || (pathfinding?.path?.length ?? 0) > 0;
  if (!walking || !transform) return;

  const targetX = pendingMove ? ~~playerMoveTo.point.x : pathfinding!.to.x;
  const targetY = pendingMove ? ~~playerMoveTo.point.y : pathfinding!.to.y;

  transform.pos.x = targetX;
  transform.pos.z = targetY;
  transform.pos.y = Ecs.world?.getTerrainHeight(targetX, targetY) ?? 0;

  if (playerMoveTo) playerMoveTo.handled = true;

  if (pathfinding) {
    pathfinding.path = null;
    pathfinding.calculated = true;
    pathfinding.from.x = targetX;
    pathfinding.from.y = targetY;
    pathfinding.to.x = targetX;
    pathfinding.to.y = targetY;
  }

  if (movement) {
    movement.velocity.x = 0;
    movement.velocity.y = 0;
  }
}

/** Ticks the energy orbs climb (LifeTime 120 -> 100) plus the turn back. */
const ENERGY_BASE_TICKS = 22;
/** Homing at up to 30 units a tick, turning as fast: fitted to MoveJoint. */
const ENERGY_TICKS_PER_TILE = 3.5;

/**
 * ATTACK_DIE orbs (ZzzCharacter.cpp:5242-5247), not drawn: the release block creates them, so they start at the
 * hero's cast release; a plain blow's request went out on its release (combat attackTiming), so at once. Both
 * land on one tick and the 1-channel SOUND_GET_ENERGY plays once (ZzzEffectJoint.cpp:3369).
 */
export function playKillEnergy(world: World, victim: Entity, skill: number): void {
  const fly = (): void => {
    const hero = world.playerEntity;
    if (!hero?.transform || !victim.transform) return;
    const tiles = Math.hypot(victim.transform.pos.x - hero.transform.pos.x, victim.transform.pos.z - hero.transform.pos.z);
    delay((ENERGY_BASE_TICKS + ENERGY_TICKS_PER_TILE * tiles) / 25, () =>
      playSfx('Sound/pEnergy', null, { bus: COMBAT_BUS, channels: 1 })
    );
  };
  if (skill) afterHeroRelease(fly);
  else fly();
}

type ObjectHitView = Pick<
  ObjectHitPacket,
  | 'ObjectId'
  | 'HealthDamage'
  | 'ShieldDamage'
  | 'Kind'
  | 'IsDoubleDamage'
  | 'IsTripleDamage'
  | 'IsRageFighterStreakHit'
  | 'IsRageFighterStreakFinalHit'
> & {
  /** Extended variant only; see `applyHealthStatus`. */
  HealthStatus?: number;
};

/** `HealthStatus` the server could not work out (WSclient.cpp:3133). */
const HEALTH_STATUS_UNKNOWN = 0xff;
/** The byte is the target's remaining health in fractions of 1/250. */
const HEALTH_STATUS_SCALE = 250;

/**
 * ReceiveAttackDamageExtended (WSclient.cpp:3133-3143): the server's own
 * reading of what the target has left. It is the only source that is right
 * whatever the monster's real maximum is, so it replaces the estimate rather
 * than adjusting it - including for a type no health table knows, which then
 * gets the server's 250 steps as its maximum.
 *
 * Only `ObjectHitExtended` carries it, and OpenMU sends that variant to the
 * open-source client line (>= 106.3); on the S6E3 line this is never called
 * and the bar runs on the table alone.
 */
function applyHealthStatus(attributes: MUAttributeSystem, status: number): void {
  const max = attributes.getValue('maxHealth');
  if (max > 0) {
    attributes.setValue('currentHealth', (max * status) / HEALTH_STATUS_SCALE);
    return;
  }
  attributes.setValue('maxHealth', HEALTH_STATUS_SCALE);
  attributes.setValue('currentHealth', status);
}

/** Bytes before the target list of RageAttackRangeResponse (C1 header 3 + skill 2 + count 1). */
const RAGE_RANGE_TARGETS_OFFSET = 6;

/** The original's `AttackPlayer`: who last sent an attack or skill animation, for Soul Barrier's hit shell. */
let lastAttacker: Entity | null = null;

function applyObjectHit(p: ObjectHitView) {
  const world = Ecs.world;
  if (!world) return;

  const maskedId = p.ObjectId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (!obj) return;
  if (obj.localPlayer) playBuffHits(world.scene, obj, lastAttacker);

  const totalDamage = p.HealthDamage + p.ShieldDamage;
  combat.observeRageHit(p.IsRageFighterStreakHit, p.IsRageFighterStreakFinalHit);

  // AttackEffect (ZzzCharacter.cpp:5250-5307): a landed blow clinks; the
  // hero's bow/crossbow hits use the missile set.
  if (totalDamage > 0) {
    const hero = world.playerEntity;
    const missile =
      world.attackTarget === obj && !!hero && usesMissileWeapon(hero.charAppearance);
    playSfx(hitSound(missile), obj.transform.pos, { bus: COMBAT_BUS });
  }

  if (!obj.localPlayer && obj.attributeSystem?.hasAttribute('currentHealth')) {
    const status = p.HealthStatus;
    if (
      obj.npcType !== undefined &&
      status !== undefined &&
      status !== HEALTH_STATUS_UNKNOWN
    ) {
      applyHealthStatus(obj.attributeSystem, status);
    } else {
      const hp = obj.attributeSystem.getValue('currentHealth');
      obj.attributeSystem.setValue(
        'currentHealth',
        Math.max(0, hp - p.HealthDamage)
      );
    }
  }

  // SetPlayerShock (ZzzCharacter.cpp:1364-1390): `Hit` is the health damage;
  // nothing flinches once dead, a Uniria / Dinorant / Dark Horse rider never
  // does, a Fenrir rider flinches on the wolf, a player finishing one of the
  // clips a skill marks `noFlinch` is not interrupted - every other clip is.
  const mount = mountKind(obj.charAppearance?.pet);
  if (
    obj.playerAnimation &&
    p.HealthDamage > 0 &&
    !obj.dying &&
    mount !== 'uniria' &&
    mount !== 'dinorant' &&
    mount !== 'horse' &&
    !combat.clipIgnoresHit(obj.playerAnimation.action)
  ) {
    const anim = obj.playerAnimation;
    if (anim.action !== PlayerAction.PLAYER_DIE1) {
      // In town the rider is on foot (SetPlayerStop), so he flinches on foot;
      // a monster skin is not MODEL_PLAYER and takes MONSTER01_SHOCK (:1399).
      const shock =
        mount === 'fenrir' &&
        !!obj.modelObject &&
        isPlayerBody(obj.modelObject) &&
        !obj.attributeSystem?.isAboveZero('inSafeZone')
          ? fenrirDamageAction(obj)
          : PlayerAction.PLAYER_SHOCK;
      if (anim.action === shock && obj.modelObject?.CurrentAction === shock) {
        obj.modelObject.restartAction();
      }
      anim.action = shock;
      if (obj.pathfinding) obj.pathfinding.path = null; // c->Movement = false
    }
  }

  // SetPlayerShock on a monster: an Attack1 / Attack2 swing is never cut
  // short, and a monster already flinching is not rewound (SetAction of the
  // clip in hand). One-shot: AnimationSystem returns it to Stop1.
  if (
    obj.monsterAnimation &&
    p.HealthDamage > 0 &&
    !isDeadMonster(obj) &&
    monsterFlinches((p.ObjectId & 0x8000) !== 0, monsterNumberOf(obj), Math.random)
  ) {
    const anim = obj.monsterAnimation;
    if (anim.action !== MonsterActionType.Attack1 && anim.action !== MonsterActionType.Attack2) {
      anim.action = MonsterActionType.Shock;
    }
  }

  if (obj.screenPosition) {
    EventBus.emit('objectDamaged', {
      entity: obj as any,
      healthDamage: p.HealthDamage,
      shieldDamage: p.ShieldDamage,
      kind: p.Kind,
      isDouble: p.IsDoubleDamage,
      isTriple: p.IsTripleDamage,
    });
  }
}

/** A remote caster turns to its target (the hero turns itself every frame). */
function faceTarget(caster: Entity, target: Entity | null): void {
  if (!target || target === caster || caster.localPlayer || !caster.transform || !target.transform) return;
  const dx = target.transform.pos.x - caster.transform.pos.x;
  const dz = target.transform.pos.z - caster.transform.pos.z;
  if (dx * dx + dz * dz > 0.01) caster.transform.rot.y = Math.atan2(dz, dx) + Math.PI / 2;
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('ObjectAnimation', packet => {
    const p = new ObjectAnimationPacket(packet);

    const maskedId = p.ObjectId & 0x7fff;
    const world = Ecs.world;
    const obj = world?.getByNetId(maskedId);

    if (!world || !obj) return;

    let serverActionId = p.Animation as ServerPlayerActionType;
    let clientActionToPlay = serverActionId;
    if (obj.monsterAnimation) {
      clientActionToPlay = ((serverActionId & 0xe0) >> 5) & 0xff;
    }

    // The hero is driven locally: AttackSystem / EmoteSystem / RestObjectSystem
    // already play the clip and face the target every frame, and the original
    // client never applies its own viewport animation packets to the Hero.
    // Applying the echo restarted the swing mid-clip (action === CurrentAction
    // is true while swinging) and snapped rot.y to the server's 45°-quantised,
    // often stale, direction.
    if (obj.localPlayer) return;

    // AttackPlayer: the last object whose attack animation arrived (ReceiveAction AT_ATTACK1/2, WSclient.cpp:3596-3608).
    const attackAction = obj.monsterAnimation ? MonsterActionType.Attack1 : ServerPlayerActionType.Attack1;
    if (clientActionToPlay === attackAction || clientActionToPlay === attackAction + 1) lastAttacker = obj;

    if (obj.monsterAnimation) {
      if (isDeadMonster(obj)) return;
      const monsterAction = clientActionToPlay as unknown as MonsterActionType;
      if (monsterAction === MonsterActionType.Attack1) {
        // AT_ATTACK1 / AT_ATTACK2 (ReceiveAction, WSclient.cpp:3596-3600):
        // SetPlayerAttack picks the clip, then AnimationFrame = 0.
        const state = monsterAttackState(obj);
        const input = attackInputOf(obj);
        const storming = meteoriteStormRunning(input.monster, state, input.now);
        setMonsterClip(obj, monsterSwing(state, input), true);
        playTrapSounds(obj, input, true, storming);
      } else {
        if (
          obj.monsterAnimation.action === monsterAction &&
          obj.modelObject?.CurrentAction === monsterAction
        ) {
          // Same one-shot clip again: restart it.
          obj.modelObject.restartAction();
        }
        obj.monsterAnimation.action = monsterAction;
      }
    } else if (obj.playerAnimation) {
      let action = ServerToClientActionMap[clientActionToPlay];
      if (
        clientActionToPlay === ServerPlayerActionType.Attack1 ||
        clientActionToPlay === ServerPlayerActionType.Attack2
      ) {
        action = chooseAttackAction(attackPoseOf(obj));
        obj.playerAnimation.swordCount = (obj.playerAnimation.swordCount ?? 0) + 1;
        // CreateArrows(): a bow in scope lets go at its clip's hit key. The
        // hero's own shot is fired by AttackSystem, off the swing it latched.
        const shotAt = world.getByNetId(p.TargetId & 0x7fff);
        if (shotAt && combat.equippedLauncher(heldWeapons(obj, world.mapIndex))) {
          const playSpeed =
            obj.modelObject?.actionPlaySpeed(action) ??
            playerPlaySpeed(action, obj.attributeSystem?.getValue('attackSpeed') ?? 0);
          delay(combat.hitDelaySeconds(action, playSpeed), () =>
            playBowShotVisual(world.scene, obj, shotAt)
          );
        }
        // AnimationFrame = 0 on every AT_ATTACK (WSclient.cpp:3596-3600). A monster body's clip is
        // not the PlayerAction and every swing maps to its attack clips: restart whichever plays.
        const model = obj.modelObject;
        if (
          model &&
          (isPlayerBody(model)
            ? obj.playerAnimation.action === action && model.CurrentAction === action
            : isMonsterSwingClip(model.CurrentAction))
        ) {
          model.restartAction();
        }
      }
      if (action !== undefined) {
        if (
          action >= PlayerAction.PLAYER_SIT1 &&
          action <= PlayerAction.PLAYER_POSE_FEMALE1
        ) {
          stopNetObjectAtTarget(obj);
        }

        obj.playerAnimation.action = resolveGenderedAction(
          action,
          obj.attributeSystem?.isAboveZero('isFemale') ?? false
        );
      }
      const santa = santaActionSound(clientActionToPlay);
      if (santa) playSfx(santa.key, obj.transform.pos, santa.opts);
    }

    obj.transform.rot.y = convertDirectionToAngle(p.Direction);
  });

  EventBus.on('SkillAnimation', packet => {
    const p = new SkillAnimationPacket(packet);
    const world = Ecs.world;
    if (!world) return;
    const casterId = p.PlayerId & 0x7fff;
    const targetId = p.TargetId & 0x7fff;
    const caster = world.getByNetId(casterId);
    if (!caster) return;
    const target = world.getByNetId(targetId) ?? null;
    if (!caster.localPlayer) lastAttacker = caster; // AttackPlayer (ReceiveMagic, WSclient.cpp:4161)

    if (isTeleportSkill(p.SkillId)) {
      playTeleportAnimation(world, p.SkillId, caster, target);
      return;
    }

    // AT_SKILL_COMBO: the server announces a landed DK combo. The original leaves the caster's
    // facing, target and clip alone and only plays SOUND_COMBO (WSclient.cpp:4167, :4829-4832).
    if (combat.observeSkillAnimation(p.SkillId, target?.netId)) {
      playSkill(p.SkillId, caster.transform.pos);
      playTargetedSkillVisual(world.scene, p.SkillId, caster, target);
      return;
    }
    faceTarget(caster, target);
    playCastAnimation(caster, p.SkillId, false);
    playTargetedSkillVisual(world.scene, p.SkillId, caster, target);
  });

  EventBus.on('ObjectGotKilled', packet => {
    const p = new ObjectGotKilledPacket(packet);

    const world = Ecs.world;
    if (!world) return;

    const killedId = p.KilledId & 0x7fff;
    const obj = world.getByNetId(killedId);

    if (!obj) {
      if (killedId === Hero.playerId) {
        runInAction(() => {
          Hero.currentHP = 0;
        });
        const playerEntity = world.playerEntity;
        if (playerEntity) {
          playerEntity.attributeSystem.setValue('currentHealth', 0);
          playerEntity.playerAnimation.action = PlayerAction.PLAYER_DIE1;
        }
      }
      return;
    }

    if (obj.pathfinding) obj.pathfinding.path = null;
    if (obj.movement) {
      obj.movement.velocity.x = 0;
      obj.movement.velocity.y = 0;
    }
    if (world.attackTarget === obj) {
      world.attackTarget = null;
    }
    obj.attributeSystem?.setValue('currentHealth', 0);

    if (obj.localPlayer) {
      runInAction(() => {
        Hero.currentHP = 0;
      });
    }
    if (world.currentPointerTarget === obj) {
      world.currentPointerTarget = null;
    }

    // Dead = 1; the Die clip itself starts in DeathSystem (at once, or when
    // the hero's killing swing connects - WSclient.cpp:5362-5384).
    const killerId = p.KillerId & 0x7fff;
    const heroKill = killerId === Hero.playerId;
    markKilled(world, obj, heroKill, p.SkillId, killerId);
    if (heroKill && obj.npcType !== undefined) playKillEnergy(world, obj, p.SkillId);
  });

  /** Dark Side (0x4B): the targets the server chose for the follow-up blows. */
  EventBus.on('RageAttackRangeResponse', packet => {
    const p = new RageAttackRangeResponsePacket(packet);
    const count = Math.floor((p.buffer.byteLength - RAGE_RANGE_TARGETS_OFFSET) / 2);
    combat.observeDarkSideTargets(
      p.SkillId,
      p.getTargets(count).map(t => t.TargetId & 0x7fff)
    );
  });

  EventBus.on('ObjectHit', packet => applyObjectHit(new ObjectHitPacket(packet)));

  // Extended plug-in variant (damage > 65535, health/shield status percentages).
  EventBus.on('ObjectHitExtended', packet =>
    applyObjectHit(new ObjectHitExtendedPacket(packet))
  );

  /**
   * C3 4A - `RageAttack`: a rage fighter's Dark Side blow on one target, shown
   * to everyone in scope like a targeted skill animation. The echo of the
   * hero's own cast starts his follow-up blows (`AttackTime = 1`, WSclient.cpp:13422-13429).
   * A later 0x4A of a Dark Side cast already drawn only turns its caster (MonkSystem.cpp:1285-1288).
   */
  EventBus.on('RageAttack', packet => {
    if (packet.byteLength < RageAttackPacket.Length!) return;
    const p = new RageAttackPacket(packet);
    const world = Ecs.world;
    if (!world) return;
    const caster = world.getByNetId(p.SourceId & 0x7fff);
    if (!caster) return;
    const target = world.getByNetId(p.TargetId & 0x7fff) ?? null;

    faceTarget(caster, target);
    if (combat.observeDarkSideEcho(p.SkillId, caster)) return;
    playCastAnimation(caster, p.SkillId, false);
    playTargetedSkillVisual(world.scene, p.SkillId, caster, target);
  });
}
