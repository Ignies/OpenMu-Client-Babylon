import { Store } from '../store';
import { Social } from '../social';
import { gameVersion } from '../version';
import { skillDefinition } from '../common/skillsDatabase';
import { calcMaxDurability, isJewel, itemDef } from '../common/itemStats';
import { InventoryConstants } from '../common/inventoryConstants';
import { PetCommandModeEnum } from '../common/packets/ClientToServerPackets';
import { isAttackableEntity } from '../ecs/systems/attackSystem';
import type { Entity, World } from '../ecs/world';
import { ensureMuHelperWatching, MuHelperState } from './state';
import type { MuHelperConfig } from './config';

/**
 * The MU Helper automation loop, ported from `CMuHelper` (MuHelper.cpp). It
 * drives only the seams the player's own clicks use: `world.castRequest`,
 * `world.pickupTarget`, `hero.playerMoveTo` and the store commands. It never
 * builds packets of its own, so combat/pickup behavior stays byte-identical
 * to manual play. Active only while `Store.muHelper.active` - the
 * server-driven status that `MuHelperStatusUpdate` pauses when the zen runs
 * out; inactive, the whole body is a single boolean check.
 */

/** `SetTimer(…, 250 ms, TimerProc)` (Winmain.cpp:1282). */
const TICK_SECONDS = 0.25;
/** `m_iLoopCounter++ == 4`: every 5th tick advances the seconds counters. */
const TICKS_PER_SECOND = 5;
const MAX_ACTIONABLE_DISTANCE = 10;
/** `DEFAULT_DURABILITY_THRESHOLD` (MuHelper.cpp:21). */
const REPAIR_THRESHOLD = 50;
const REPAIR_INTERVAL_SECONDS = 10;
/** Recast gap for buffs whose effect id the client cannot observe. */
const UNMAPPED_BUFF_RECAST_SECONDS = 60;
/** Seconds between stop requests while standing in a safe zone. */
const STOP_REQUEST_INTERVAL = 3;
/** Seconds between re-issued regroup walks. */
const MOVE_REISSUE_SECONDS = 1;

const HEAL_SKILL = 26; // Heal (Elf)
const DRAIN_LIFE_SKILL = 214; // Drain Life (Summoner)

/**
 * Skill name -> `MagicEffectStatus` id, for the "already buffed" check
 * (`BuffTarget`'s `g_isCharacterBuff` calls). Entities carry the active
 * effect ids in their `buffs` set.
 */
const BUFF_EFFECT_BY_NAME: Readonly<Record<string, number>> = {
  'Greater Damage': 1,
  'Greater Defense': 2,
  'Soul Barrier': 4,
  'Critical Damage Increase': 5,
  'Infinity Arrow': 6,
  'Greater Fortitude': 8,
  Berserker: 81,
  'Expansion of Wizardry': 82,
};

interface Point {
  x: number;
  y: number;
}

let wasActive = false;
let tickAccum = 0;
let loopCounter = 0;
let secondsElapsed = 0;
let secondsAway = 0;
let originalPos: Point = { x: 0, y: 0 };
let originMap = -1;
let buffIndex = 0;
let buffPartyIndex = 0;
let healPartyIndex = 0;
let comboState = 0;
let currentTarget: Entity | null = null;
let petActivated = false;
let timerBuffOngoing = false;
let lastTimerBuffSecond = -1;
let repairCooldown = 0;
let stopRequestCooldown = 0;
let moveReissueCooldown = 0;
const lastBuffCastAt = new Map<number, number>();

function resetRuntime(): void {
  tickAccum = 0;
  loopCounter = 0;
  secondsElapsed = 0;
  secondsAway = 0;
  buffIndex = 0;
  buffPartyIndex = 0;
  healPartyIndex = 0;
  comboState = 0;
  currentTarget = null;
  petActivated = false;
  timerBuffOngoing = false;
  lastTimerBuffSecond = -1;
  repairCooldown = 0;
  stopRequestCooldown = 0;
  moveReissueCooldown = 0;
  lastBuffCastAt.clear();
}

/** `ComputeDistanceByRange`: the diagonal of a range x range square. */
function distanceByRange(range: number): number {
  return Math.ceil(Math.sqrt(range * range * 2));
}

function tileDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.ceil(Math.sqrt(dx * dx + dy * dy));
}

function heroTile(hero: Entity): Point {
  const pos = hero.transform!.pos;
  return { x: ~~pos.x, y: ~~pos.z };
}

function entityTile(e: Entity): Point {
  const pos = e.transform!.pos;
  return { x: ~~pos.x, y: ~~pos.z };
}

function isLearned(num: number): boolean {
  return num > 0 && Store.skills.some(s => s.number === num);
}

/** `(life * 100 + max - 1) / max` - the original's ceiling percent. */
function heroHpPercent(): number {
  const { currentHP, maxHP } = Store.playerData;
  if (maxHP <= 0 || currentHP <= 0) return 100;
  return Math.trunc((currentHP * 100 + maxHP - 1) / maxHP);
}

/** Issue a cast through the same seam a right-click uses. Returns busy. */
function castSkill(world: World, num: number, target: Entity): boolean {
  if (world.castRequest) return true; // the player's own cast wins
  if (Store.currentSkill !== num) Store.selectSkill(num);
  if (Store.currentSkill !== num) return false;
  const pos = target.transform!.pos;
  world.castRequest = { target, point: { x: pos.x, y: pos.z } };
  return true;
}

function walkTo(hero: Entity, point: Point): void {
  const moveTo = hero.playerMoveTo!;
  moveTo.point.x = point.x;
  moveTo.point.y = point.y;
  moveTo.handled = false;
  moveTo.sendToServer = true;
}

function findPartyEntity(world: World, name: string): Entity | null {
  if (name === Store.playerData.name) return world.playerEntity ?? null;
  for (const e of world.playersQuery.entities) {
    if (e.objectNameInWorld === name && !e.dying) return e;
  }
  return null;
}

/** `CMuHelper::ActivatePet` - the Dark Raven command, once per activation. */
function activatePet(config: MuHelperConfig): void {
  if (!config.useDarkRaven || petActivated) return;
  const mode =
    config.darkRavenMode === 1
      ? PetCommandModeEnum.AttackRandom
      : config.darkRavenMode === 2
        ? PetCommandModeEnum.AttackWithOwner
        : PetCommandModeEnum.Normal;
  Store.sendPetCommand(mode);
  petActivated = true;
}

/**
 * `CMuHelper::BuffTarget`: cast when the effect is missing (or the timer
 * recast is on). Buffs without a known effect id fall back to a fixed gap -
 * the client cannot observe those. Returns busy when a cast went out.
 */
function buffTarget(world: World, target: Entity, num: number): boolean {
  const def = skillDefinition(num);
  if (!def || !isLearned(num)) return false;

  const effect = BUFF_EFFECT_BY_NAME[def.name];
  if (effect !== undefined) {
    if (target.buffs?.has(effect) && !timerBuffOngoing) return false;
  } else {
    const last = lastBuffCastAt.get(num);
    if (
      last !== undefined &&
      secondsElapsed - last < UNMAPPED_BUFF_RECAST_SECONDS &&
      !timerBuffOngoing
    ) {
      return false;
    }
  }

  if (!castSkill(world, num, target)) return false;
  lastBuffCastAt.set(num, secondsElapsed);
  return true;
}

/** `CMuHelper::Buff` - rotate the three slots over self or the party. */
function buff(world: World, hero: Entity, config: MuHelperConfig): boolean {
  if (!config.buffs.some(n => n > 0)) return true;

  const partyMode = config.supportParty && Social.partyMembers.length > 0;
  const duration = partyMode ? config.buffDurationParty : config.buffDuration;
  if (
    !duration &&
    config.buffCastInterval > 0 &&
    secondsElapsed > 0 &&
    secondsElapsed % config.buffCastInterval === 0 &&
    lastTimerBuffSecond !== secondsElapsed
  ) {
    timerBuffOngoing = true;
    lastTimerBuffSecond = secondsElapsed;
  }

  const skillNum = config.buffs[buffIndex];
  let busy = false;

  if (partyMode) {
    const members = Social.partyMembers;
    const member = members[buffPartyIndex % members.length];
    const target = member ? findPartyEntity(world, member.name) : null;
    if (
      target &&
      member.mapId === world.mapIndex &&
      tileDistance(heroTile(hero), entityTile(target)) <= MAX_ACTIONABLE_DISTANCE
    ) {
      busy = skillNum > 0 && buffTarget(world, target, skillNum);
    }
    buffPartyIndex = (buffPartyIndex + 1) % members.length;
    if (buffPartyIndex === 0) {
      buffIndex = (buffIndex + 1) % config.buffs.length;
      if (buffIndex === 0) timerBuffOngoing = false;
    }
  } else {
    busy = skillNum > 0 && buffTarget(world, hero, skillNum);
    buffIndex = (buffIndex + 1) % config.buffs.length;
    if (buffIndex === 0) timerBuffOngoing = false;
  }

  return !busy;
}

/** `FindHealingItemIndex`: the first HP or complex potion in the bag. */
function findHealingPotionSlot(): number {
  const items = Store.playerData.items;
  for (let slot = InventoryConstants.EquippableSlotsCount; slot < items.length; slot++) {
    const item = items[slot];
    if (!item || item.group !== 14) continue;
    if (item.num <= 3 || (item.num >= 38 && item.num <= 40)) return slot;
  }
  return -1;
}

function nearestTarget(world: World, hero: Entity, maxDistance: number): Entity | null {
  const from = heroTile(hero);
  let best: Entity | null = null;
  let bestDist = maxDistance + 1;
  for (const e of world.netObjsQuery.entities) {
    if (!isAttackableEntity(world, e)) continue;
    const dist = tileDistance(from, entityTile(e));
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return best;
}

function countTargetsNearby(world: World, hero: Entity, maxDistance: number): number {
  const from = heroTile(hero);
  let count = 0;
  for (const e of world.netObjsQuery.entities) {
    if (!isAttackableEntity(world, e)) continue;
    if (tileDistance(from, entityTile(e)) <= maxDistance) count++;
  }
  return count;
}

/** `CMuHelper::RecoverHealth`: heal, drain life, then the potion. */
function recoverHealth(world: World, hero: Entity, config: MuHelperConfig): boolean {
  const hpPercent = heroHpPercent();

  if (config.autoHeal && isLearned(HEAL_SKILL)) {
    if (config.autoHealParty && Social.partyMembers.length > 0) {
      const members = Social.partyMembers;
      const member = members[healPartyIndex % members.length];
      healPartyIndex = (healPartyIndex + 1) % members.length;
      if (member) {
        if (member.name === Store.playerData.name) {
          if (hpPercent <= config.healThreshold && castSkill(world, HEAL_SKILL, hero)) {
            return false;
          }
        } else if (
          member.mapId === world.mapIndex &&
          member.healthStep >= 0 &&
          member.healthStep * 10 <= config.healPartyThreshold
        ) {
          const target = findPartyEntity(world, member.name);
          if (
            target &&
            tileDistance(heroTile(hero), entityTile(target)) <= MAX_ACTIONABLE_DISTANCE &&
            castSkill(world, HEAL_SKILL, target)
          ) {
            return false;
          }
        }
      }
    } else if (hpPercent <= config.healThreshold && castSkill(world, HEAL_SKILL, hero)) {
      return false;
    }
  }

  if (
    config.useDrainLife &&
    isLearned(DRAIN_LIFE_SKILL) &&
    hpPercent <= config.healThreshold
  ) {
    const target = nearestTarget(world, hero, distanceByRange(config.huntingRange));
    if (target && castSkill(world, DRAIN_LIFE_SKILL, target)) return false;
  }

  if (config.useHealPotion && hpPercent <= config.potionThreshold) {
    const slot = findHealingPotionSlot();
    if (slot >= 0) Store.consumeItemRequest(slot);
  }

  return true;
}

/** `CMuHelper::ShouldObtainItem` - the pickup filters. */
function shouldObtain(config: MuHelperConfig, e: Entity): boolean {
  const drop = e.droppedItem!;
  if (config.pickZen && drop.isMoney) return true;
  if (drop.isMoney) return config.pickAllItems;

  const def = itemDef(drop.group, drop.num);
  if (config.pickJewel && def && isJewel(def)) return true;
  if (config.pickAncient && drop.item?.isAncient) return true;
  if (config.pickExcellent && drop.item?.isExcellent) return true;

  if (config.pickExtraItems && def) {
    const name = def.name.toLowerCase();
    if (config.extraItems.some(entry => name.includes(entry.toLowerCase()))) {
      return true;
    }
  }

  return config.pickAllItems;
}

/** `CMuHelper::ObtainItem` via the pickup seam (`world.pickupTarget`). */
function obtainItem(world: World, hero: Entity, config: MuHelperConfig): boolean {
  if (world.pickupTarget) return false; // still walking to one

  const maxDistance = distanceByRange(config.obtainRange);
  const from = heroTile(hero);
  let best: Entity | null = null;
  let bestDist = maxDistance + 1;
  for (const e of world.netObjsQuery.entities) {
    if (!e.droppedItem || e.objOutOfScope) continue;
    if (e.worldIndex !== undefined && e.worldIndex !== world.mapIndex) continue;
    if (!shouldObtain(config, e)) continue;
    const dist = tileDistance(from, entityTile(e));
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }

  if (!best) return true;
  world.pickupTarget = best;
  return false;
}

/** `CMuHelper::Regroup` - walk back after too long away from the anchor. */
function regroup(world: World, hero: Entity, config: MuHelperConfig): boolean {
  if (!config.returnToOriginalPosition || secondsAway <= config.maxSecondsAway) {
    return true;
  }

  if (tileDistance(heroTile(hero), originalPos) > 1) {
    if (moveReissueCooldown <= 0) {
      moveReissueCooldown = MOVE_REISSUE_SECONDS;
      walkTo(hero, originalPos);
    }
    return false;
  }

  secondsAway = 0;
  comboState = 0;
  currentTarget = null;
  return true;
}

/**
 * `CMuHelper::SelectAttackSkill`: activation skill 1/2 on their timer or
 * mob-count condition, else the basic skill. The "mobs attacking" basis
 * falls back to the nearby count - OpenMU's damage packets name the victim,
 * not the attacker, so the client cannot know who is attacking it.
 */
function selectAttackSkill(world: World, hero: Entity, config: MuHelperConfig): number {
  const nearby = countTargetsNearby(
    world,
    hero,
    distanceByRange(config.huntingRange)
  );

  for (const index of [1, 2] as const) {
    const num = config.skills[index];
    if (!isLearned(num)) continue;
    const cond = config.skillConditions[index];
    const interval = config.skillIntervals[index];
    if (cond.onTimer && interval > 0 && secondsElapsed % interval === 0) {
      return num;
    }
    if (cond.onCondition && nearby >= cond.minMobs) return num;
  }

  return isLearned(config.skills[0]) ? config.skills[0] : 0;
}

/** `CMuHelper::Attack` (+ `SimulateComboAttack`) through the cast seam. */
function attack(world: World, hero: Entity, config: MuHelperConfig): void {
  const huntDistance = distanceByRange(config.huntingRange);

  if (
    currentTarget &&
    (!isAttackableEntity(world, currentTarget) ||
      currentTarget.dying ||
      tileDistance(heroTile(hero), entityTile(currentTarget)) > huntDistance + 4)
  ) {
    currentTarget = null;
  }
  if (!currentTarget) currentTarget = nearestTarget(world, hero, huntDistance);
  if (!currentTarget) {
    comboState = 0;
    return;
  }

  let skillNum: number;
  if (config.useCombo && config.skills.every(n => isLearned(n))) {
    skillNum = config.skills[comboState];
    comboState = (comboState + 1) % 3;
  } else {
    skillNum = selectAttackSkill(world, hero, config);
  }
  if (skillNum <= 0) return;

  castSkill(world, skillNum, currentTarget);
}

/** `CMuHelper::RepairEquipments` at the 50% durability line, throttled. */
function repairEquipment(config: MuHelperConfig): void {
  if (!config.repairItem || repairCooldown > 0) return;
  repairCooldown = REPAIR_INTERVAL_SECONDS;

  const items = Store.playerData.items;
  for (let slot = 0; slot < InventoryConstants.EquippableSlotsCount; slot++) {
    const item = items[slot];
    if (!item || item.durability === undefined) continue;
    const def = itemDef(item.group, item.num);
    if (!def) continue;
    const max = calcMaxDurability(
      def,
      item.lvl ?? 0,
      item.isExcellent === true,
      item.isAncient === true
    );
    if (max <= 0) continue;
    const percent = Math.trunc((item.durability * 100 + max - 1) / max);
    if (percent <= REPAIR_THRESHOLD) Store.repairItemRequest(slot);
  }
}

/** `CMuHelper::Work` - one 250 ms tick, one action at most. */
function work(world: World, hero: Entity, config: MuHelperConfig): void {
  activatePet(config);
  if (!buff(world, hero, config)) return;
  if (!recoverHealth(world, hero, config)) return;
  if (!obtainItem(world, hero, config)) return;
  if (!regroup(world, hero, config)) return;
  attack(world, hero, config);
  repairEquipment(config);
}

export function updateMuHelperLoop(world: World, dt: number): void {
  if (!gameVersion.features.muHelper) return;
  ensureMuHelperWatching();

  if (!Store.muHelper.active) {
    if (wasActive) {
      resetRuntime();
      wasActive = false;
    }
    return;
  }

  const hero = world.playerEntity;
  if (!hero || hero.dying) return;

  if (!wasActive) {
    resetRuntime();
    originalPos = heroTile(hero);
    originMap = world.mapIndex;
    wasActive = true;
  }
  if (world.mapIndex !== originMap) {
    // Warped mid-run: re-anchor the regroup position.
    originalPos = heroTile(hero);
    originMap = world.mapIndex;
    secondsAway = 0;
    currentTarget = null;
  }

  repairCooldown -= dt;
  stopRequestCooldown -= dt;
  moveReissueCooldown -= dt;

  // `WorkLoop`: entering a safe zone stops the helper (`TriggerStop`).
  if (hero.attributeSystem?.isAboveZero('inSafeZone')) {
    if (stopRequestCooldown <= 0) {
      stopRequestCooldown = STOP_REQUEST_INTERVAL;
      Store.toggleMuHelper();
    }
    return;
  }

  tickAccum += dt;
  if (tickAccum < TICK_SECONDS) return;
  tickAccum = Math.min(tickAccum - TICK_SECONDS, TICK_SECONDS);

  try {
    work(world, hero, MuHelperState.config);
  } catch {
    // `Work` swallows too: one bad tick must not kill the loop.
  }

  if (++loopCounter >= TICKS_PER_SECOND) {
    loopCounter = 0;
    secondsElapsed++;
    if (tileDistance(heroTile(hero), originalPos) > 1) secondsAway++;
    else secondsAway = 0;
  }
}

/** Test/debug seam: drop all runtime state. */
export function resetMuHelperLoop(): void {
  resetRuntime();
  wasActive = false;
}
