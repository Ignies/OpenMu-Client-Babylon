import type { Entity, ISystemFactory } from '../world';
import { Store } from '../../store';
import { applyPlayerActionSpeed, serverMinAttackInterval } from '../../common/playSpeed';
import {
  AreaSkillPacket,
  EnterGateRequestPacket,
  RageAttackRangeRequestPacket,
  RageAttackRequestPacket,
  InstantMoveRequestPacket,
  TargetedSkillPacket,
  TeleportTargetPacket,
} from '../../common/packets/ClientToServerPackets';
import { skillDefinition, type SkillDefinition } from '../../common/skillsDatabase';
import {
  chooseSkillAction,
  isAreaSkill,
  isSelfCastable,
  isTeleportSkill,
  rotationByte256,
  TELEPORT,
} from '../../common/skillCasting';
import { TW_SAFEZONE } from '../../common/terrain/consts';
import { isAttackableEntity } from './attackSystem';
import { isFemaleClass } from '../../common/mapPlayerNetClassToModelClass';
import { mountKind } from '../../common/pets';
import { skillSound } from '../../common/combatSounds';
import { playSfx } from '../../libs/sfx';
import { skills } from '../../skills';
import { combat } from '../../combat';
import { SKILL_NOVA, SKILL_NOVA_BEGIN } from '../../combat/recipes';
import { CONSECUTIVE_ATTACK_KEY } from '../../combat/skillMovement';
import { castsOnSelfOnly } from '../../combat/castTargets';
import type { PlayerAction } from '../../common/objects/enum';
import type { CastContext } from '../../combat';

/**
 * Right-click skill use (Attack() / ExecuteSkill, ZzzInterface.cpp:6703-7130):
 * the current skill is cast on the object under the cursor, or on the ground
 * point for area skills; the hero first walks into the skill's Distance, then
 * the packet is sent and the cast clip plays. Holding the right button
 * repeats the cast once the clip has played through.
 *
 * Timing and wire specials come from the `combat` layer: the per-skill clip
 * (through `chooseSkillAction`), the Nova hold (58 on press, 40 on release),
 * Dark Side's 0x4B/0x4A pair with its follow-up blows, and the 0xDB
 * `AreaSkillHit` for skills whose hits the client names. Re-use delays and
 * usability are the `skills` layer's verdict.
 */

const FALLBACK_CAST_COOLDOWN = 0.8;
const APPROACH_INTERVAL = 0.4;
const DEFAULT_RANGE = 1.8;
const NO_EXTRA_TARGET = 0xffff;

function isPlayer(e: Entity): boolean {
  return !!e.playerAnimation && e.netId !== undefined && !e.dying;
}

export const SkillCastSystem: ISystemFactory = world => {
  let cooldown = 0;
  let approachDelay = 0;
  let alternate = false;
  /**
   * A Rage Fighter contact skill whose step has not landed yet. Beast
   * Uppercut, Chain Drive and Dragon Slasher relocate the caster partway
   * through the clip rather than as it starts (`IsRageHalfwaySkillAni` /
   * `UseSkillRagePosition`, MonkSystem.cpp:428-442), which is what makes
   * them read as a lunge instead of a swing on the spot.
   */
  let pendingStep: {
    clip: PlayerAction;
    to: { x: number; y: number };
    /** Seconds left to see the clip reach its key before the step is dropped. */
    expiresIn: number;
  } | null = null;

  function playClip(hero: Entity, action: PlayerAction): number {
    const model = hero.modelObject;
    if (model) applyPlayerActionSpeed(model, action, hero.attributeSystem);
    if (model && hero.playerAnimation!.action === action) {
      model.restartAction();
    }
    hero.playerAnimation!.action = action;
    return model?.getActionDuration(action) ?? 0;
  }

  /**
   * What the clip switches branch on: the mount (collapsed to none inside a
   * safe zone, the way every `&& !c->SafeZone` in the original does),
   * `IsFemale(Class)` — which is Elf *and* Summoner, not "is elf" — and the
   * active world, for Rider's flying variant.
   */
  function castContext(hero: Entity): CastContext {
    const cls = hero.charAppearance?.charClass ?? Store.playerData.charClass;
    const inSafeZone = !!hero.attributeSystem?.isAboveZero('inSafeZone');
    return {
      mount: mountKind(hero.charAppearance?.pet, inSafeZone),
      isFemale: isFemaleClass(cls),
      world: world.mapIndex,
      alternate,
    };
  }

  function clipFor(hero: Entity, def: SkillDefinition): PlayerAction {
    const action = chooseSkillAction(def, hero.charAppearance, castContext(hero));
    alternate = !alternate;
    return action;
  }

  function sendTargeted(skill: number, targetId: number): void {
    if (Store.isOffline) return;
    const packet = TargetedSkillPacket.createPacket();
    packet.SkillId = skill;
    packet.TargetId = targetId;
    Store.sendToGS(packet.buffer);
  }

  function sendRageAttack(skill: number, targetId: number): void {
    if (Store.isOffline) return;
    const packet = RageAttackRequestPacket.createPacket();
    packet.SkillId = skill;
    packet.TargetId = targetId;
    Store.sendToGS(packet.buffer);
  }

  /** Dark Side: one 0x4A per extra target as the follow-up blows come round. */
  function drainDarkSide(): void {
    for (;;) {
      const id = combat.nextDarkSideHit();
      if (id < 0) return;
      sendRageAttack(combat.darkSidePendingSkill, id);
    }
  }

  /**
   * Teleport (6) / Teleport Ally (15): the square under the cursor is the
   * destination. The original refuses the click in silence when the square
   * is not walkable, lies in a safe zone or is out of the skill's Distance
   * (`AT_SKILL_TELEPORT`, ZzzInterface.cpp); OpenMU adds that the caster
   * must stand outside a safe zone too, and Teleport Ally wants a party
   * member as the target. The hero moves when the server's `MapChanged`
   * says so — nothing is moved here.
   */
  function castTeleport(
    hero: Entity,
    def: SkillDefinition,
    target: Entity | null,
    point: { x: number; y: number } | null
  ): boolean {
    if (!point) return false;
    const x = ~~point.x;
    const y = ~~point.y;
    const heroPos = hero.transform!.pos;
    const dist = Math.hypot(x - heroPos.x, y - heroPos.z);
    const range = def.distance > 0 ? def.distance + 0.5 : DEFAULT_RANGE;
    const inSafeZone = !!hero.attributeSystem?.isAboveZero('inSafeZone');
    if (
      inSafeZone ||
      dist > range ||
      !world.isWalkable(x, y) ||
      (world.getTerrainFlag(x, y) & TW_SAFEZONE) !== 0
    ) {
      return false;
    }
    const ally = def.num !== TELEPORT;
    if (ally && !(target && isPlayer(target) && target !== hero)) return false;
    if (!skills.canUse(def.num)) return false;
    skills.startCooldown(def.num);

    if (!Store.isOffline) {
      if (ally) {
        const packet = TeleportTargetPacket.createPacket();
        packet.TargetId = target!.netId!;
        packet.TeleportTargetX = x;
        packet.TeleportTargetY = y;
        Store.sendToGS(packet.buffer);
      } else {
        const packet = EnterGateRequestPacket.createPacket();
        packet.GateNumber = 0;
        packet.TeleportTargetX = x;
        packet.TeleportTargetY = y;
        Store.sendToGS(packet.buffer);
      }
    } else if (!ally) {
      // No server to answer: the swap the MapChanged handler would do.
      heroPos.x = x;
      heroPos.z = y;
      heroPos.y = world.getTerrainHeight(x, y);
    }
    return true;
  }

  /** The attackable object nearest to (x, y), within `radius` tiles of it. */
  function nearestAttackable(x: number, y: number, radius: number): Entity | null {
    let best: Entity | null = null;
    let bestD = radius * radius;
    for (const e of world.netObjsQuery.entities) {
      if (!isAttackableEntity(world, e)) continue;
      const dx = e.transform!.pos.x - x;
      const dz = e.transform!.pos.z - y;
      const d = dx * dx + dz * dz;
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /**
   * `SendInstantMoveRequest(CharPosX, CharPosY)` (MonkSystem.cpp:466-473):
   * the caster is put on the square one tile short of the target, along the
   * line between them, when that square is walkable. The server answers with
   * the move; offline the hero is placed directly so the lunge is still
   * visible.
   */
  function stepIn(hero: Entity, to: { x: number; y: number }): void {
    const x = ~~to.x;
    const y = ~~to.y;
    if (!world.isWalkable(x, y)) return;
    if (!Store.isOffline) {
      const packet = InstantMoveRequestPacket.createPacket();
      packet.TargetX = x;
      packet.TargetY = y;
      Store.sendToGS(packet.buffer);
    }
    const pos = hero.transform!.pos;
    pos.x = x;
    pos.z = y;
    pos.y = world.getTerrainHeight(x, y);
  }

  /**
   * The mid-clip half: the step lands the first time the clip passes the
   * consecutive-attack key, once per cast. The clip itself is only started by
   * `animationSystem` later in the frame, so this waits for the model to be
   * in it rather than latching a serial at cast time, and gives up after the
   * clip's own length in case it never gets there (the cast was interrupted,
   * the hero walked away, the model is still loading).
   *
   * The original also re-sends the skill packet on this frame; that is not
   * repeated here, because the cast already went out as a
   * `RageAttackRequest` and OpenMU reads a second one as a second hit.
   * Chain Drive keeps the facing it stepped in with (`m_btAttState ==
   * FRAME_SECONDATT`, MonkSystem.cpp:476-478), which `clipHoldsFacing` covers.
   */
  function drainPendingStep(hero: Entity, dt: number): void {
    if (!pendingStep) return;
    pendingStep.expiresIn -= dt;
    if (pendingStep.expiresIn <= 0) {
      pendingStep = null;
      return;
    }
    const model = hero.modelObject;
    if (!model || model.CurrentAction !== pendingStep.clip) return;
    if (model.actionFrame() < CONSECUTIVE_ATTACK_KEY) return;
    stepIn(hero, pendingStep.to);
    pendingStep = null;
  }

  /** 0xDB: name the attackable objects inside the area around (x, y). */
  function sendAreaHit(def: SkillDefinition, x: number, y: number): void {
    if (Store.isOffline || !combat.needsAreaHit(def)) return;
    const radius = combat.areaHitRadius(def);
    const ids: number[] = [];
    for (const e of world.netObjsQuery.entities) {
      if (!isAttackableEntity(world, e)) continue;
      const dx = e.transform!.pos.x - x;
      const dz = e.transform!.pos.z - y;
      if (dx * dx + dz * dz <= radius * radius) ids.push(e.netId!);
    }
    const packet = combat.buildAreaHit(def.num, x, y, ids);
    if (packet) Store.sendToGS(packet.buffer);
  }

  return {
    update: dt => {
      cooldown -= dt;
      approachDelay -= dt;

      const hero = world.playerEntity;
      if (!hero || hero.dying) {
        world.castRequest = null;
        if (combat.novaCharging) combat.releaseNova();
        return;
      }

      drainDarkSide();
      drainPendingStep(hero, dt);

      const req = world.castRequest;

      // ---- Nova hold: the button came up (or the left button was clicked)
      // while charging → AT_SKILL_NOVA at the selected target (`SkillKeyPush`).
      if (combat.novaCharging && (!world.rightPointerPressed || world.pointerPressed)) {
        combat.releaseNova();
        const def = skillDefinition(SKILL_NOVA);
        const target = req?.target ?? null;
        const targetId =
          target && isAttackableEntity(world, target) && target.netId !== undefined
            ? target.netId
            : (Store.playerId ?? 0);
        sendTargeted(SKILL_NOVA, targetId);
        if (def) {
          const duration = playClip(hero, clipFor(hero, def));
          cooldown = Math.max(
            duration > 0 ? duration : FALLBACK_CAST_COOLDOWN,
            serverMinAttackInterval(hero.attributeSystem?.getValue('attackSpeed') ?? 0)
          );
          const sfx = skillSound(def.num);
          if (sfx) playSfx(sfx, hero.transform.pos);
        }
        world.castRequest = null;
        return;
      }

      if (!req) return;

      // Ctrl force cast is an attack gesture: inside a safe zone it is
      // refused outright, the same way `isAttackableEntity` already refuses
      // the plain attack click there (attackSystem).
      if (req.forced && hero.attributeSystem?.isAboveZero('inSafeZone')) {
        world.castRequest = null;
        return;
      }

      const def = skillDefinition(Store.currentSkill);
      if (!def) {
        // No skill selected: the right button behaves like a plain attack click.
        if (req.target && isAttackableEntity(world, req.target)) {
          world.attackTarget = req.target;
        }
        world.castRequest = null;
        return;
      }

      // ---- Nova hold: the button is down — keep the charge clip up.
      if (combat.novaCharging) {
        const model = hero.modelObject;
        if (model?.ActionIterationWasFinished) {
          const beginDef = skillDefinition(SKILL_NOVA_BEGIN);
          if (beginDef) playClip(hero, clipFor(hero, beginDef));
        }
        return;
      }

      if (cooldown > 0) return;

      // ---- Teleport: a one-shot at the square under the cursor.
      if (isTeleportSkill(def.num)) {
        const point = req.point;
        if (castTeleport(hero, def, req.target ?? null, point)) {
          const heroPos = hero.transform.pos;
          const dx = ~~point!.x - heroPos.x;
          const dz = ~~point!.y - heroPos.z;
          if (dx * dx + dz * dz > 0.01) hero.transform.rot.y = Math.atan2(dz, dx) + Math.PI / 2;
          const { pathfinding } = hero;
          pathfinding.path = null;
          const duration = playClip(hero, clipFor(hero, def));
          const sfx = skillSound(def.num);
          if (sfx) playSfx(sfx, heroPos);
          cooldown = duration > 0 ? duration : FALLBACK_CAST_COOLDOWN;
        }
        world.castRequest = null;
        return;
      }

      const area = isAreaSkill(def);

      let target: Entity | null = req.target ?? null;
      if (
        target &&
        !(isAttackableEntity(world, target) || (isPlayer(target) && target !== hero))
      ) {
        target = null;
      }
      // Ctrl + right button on a targeted skill: the hovered object was
      // dropped by the pointer system, so aim at whoever stands nearest the
      // cursor's ground point inside the skill's reach instead.
      if (req.forced && !area && !target && req.point && !isSelfCastable(def)) {
        target = nearestAttackable(req.point.x, req.point.y, def.distance > 0 ? def.distance : DEFAULT_RANGE);
      }
      // `SendRequestMagic(Skill, HeroKey)` with the selection ignored: Swell
      // Life, the elf summons, Infinity Arrow, Berserker and the Rage
      // Fighter party buffs go out on the caster even with a monster picked.
      if (castsOnSelfOnly(def)) target = hero;
      else if (!area && !target && isSelfCastable(def)) target = hero;

      const heroPos = hero.transform.pos;
      let tx: number | undefined;
      let ty: number | undefined;
      if (target) {
        tx = target.transform!.pos.x;
        ty = target.transform!.pos.z;
      } else if ((area || req.forced) && req.point) {
        // Forced cast with nothing near the cursor still fires at the
        // ground point instead of silently returning.
        tx = req.point.x;
        ty = req.point.y;
      }

      // ---- Nova: the press starts the charge on the hero, no target needed.
      if (def.num === SKILL_NOVA) {
        const beginDef = skillDefinition(SKILL_NOVA_BEGIN) ?? def;
        if (!skills.canUse(SKILL_NOVA) || !combat.beginNova()) {
          world.castRequest = null;
          return;
        }
        skills.startCooldown(SKILL_NOVA);
        sendTargeted(SKILL_NOVA_BEGIN, Store.playerId ?? 0);
        playClip(hero, clipFor(hero, beginDef));
        return;
      }

      if (tx === undefined || ty === undefined) {
        if (!world.rightPointerPressed) world.castRequest = null;
        return;
      }

      const dx = ~~tx - heroPos.x;
      const dz = ~~ty - heroPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const range = def.distance > 0 ? def.distance + 0.5 : DEFAULT_RANGE;

      // Force cast (Ctrl) fires in place like the original's force attack -
      // it never walks the hero into range first.
      if (target !== hero && dist > range && !req.forced) {
        if (approachDelay <= 0) {
          approachDelay = APPROACH_INTERVAL;
          const moveTo = hero.playerMoveTo;
          moveTo.point.x = tx;
          moveTo.point.y = ty;
          moveTo.handled = false;
          moveTo.sendToServer = true;
        }
        return;
      }

      // `LetHeroStop()` (ZzzInterface.cpp:1935): every cast drops the path
      // first, so a skill is never taken mid-stride.
      const { pathfinding } = hero;
      if (pathfinding.path && pathfinding.path.length > 0) {
        pathfinding.path = null;
        pathfinding.from = { x: ~~heroPos.x, y: ~~heroPos.z };
        pathfinding.to = { x: ~~heroPos.x, y: ~~heroPos.z };
      }
      // `bLookAtMouse = false` (:7394-7419): Rageful Blow and Chain Drive
      // keep the facing they started with, so a repeat cast does not snap
      // the caster round mid-swing.
      const heldClip =
        hero.modelObject &&
        !hero.modelObject.ActionIterationWasFinished &&
        combat.clipHoldsFacing(hero.modelObject.CurrentAction);
      if (target !== hero && dist > 0.01 && !heldClip) {
        hero.transform.rot.y = Math.atan2(dz, dx) + Math.PI / 2;
      }

      // Mana / AG / re-use delay / requirements are gated client-side first
      // (the skill layer's verdict; the server re-checks everything).
      if (!skills.canUse(def.num)) {
        world.castRequest = null;
        return;
      }
      skills.startCooldown(def.num);

      if (!Store.isOffline) {
        if (!area && !target) {
          // Forced cast with nothing near the cursor: the clip whiffs
          // toward the ground point and nothing goes on the wire. The hero
          // key must not stand in here — a targeted packet naming the
          // caster lands the skill on the character, not at the cursor.
        } else if (combat.isDarkSide(def.num)) {
          // Dark Side: 0x4B asks the server for the targets, 0x4A lands the
          // first blow (ZzzInterface.cpp:2841-2842).
          const targetId = target?.netId ?? Store.playerId ?? 0;
          const range = RageAttackRangeRequestPacket.createPacket();
          range.SkillId = def.num;
          range.TargetId = targetId;
          Store.sendToGS(range.buffer);
          sendRageAttack(def.num, targetId);
          combat.beginDarkSide(def.num, targetId);
        } else if (area) {
          const packet = AreaSkillPacket.createPacket();
          packet.SkillId = def.num;
          packet.TargetX = ~~tx;
          packet.TargetY = ~~ty;
          packet.Rotation = rotationByte256(hero.transform.rot.y);
          packet.ExtraTargetId = target?.netId ?? NO_EXTRA_TARGET;
          Store.sendToGS(packet.buffer);
          sendAreaHit(def, ~~tx, ~~ty);
        } else {
          sendTargeted(def.num, target!.netId ?? Store.playerId ?? 0);
        }
      }

      // Where the cast puts the caster (`combat/skillMovement`): the contact
      // skills close the last tile themselves, either now or partway through
      // the clip.
      const step = combat.skillStepIn(def.num);
      const stepSquare =
        step && target && target !== hero
          ? combat.stepInSquare(
              { x: heroPos.x, y: heroPos.z },
              { x: target.transform!.pos.x, y: target.transform!.pos.z }
            )
          : null;
      if (step === 'cast' && stepSquare) stepIn(hero, stepSquare);

      const action = clipFor(hero, def);
      const duration = playClip(hero, action);

      if (step === 'midClip' && stepSquare) {
        pendingStep = {
          clip: action,
          to: stepSquare,
          expiresIn: duration > 0 ? duration : FALLBACK_CAST_COOLDOWN,
        };
      }

      // ExecuteSkill plays the skill's sound as the cast starts.
      const sfx = skillSound(def.num);
      if (sfx) playSfx(sfx, hero.transform.pos);

      cooldown = Math.max(
        duration > 0 ? duration : FALLBACK_CAST_COOLDOWN,
        serverMinAttackInterval(hero.attributeSystem?.getValue('attackSpeed') ?? 0)
      );

      if (!world.rightPointerPressed) world.castRequest = null;
    },
  };
};
