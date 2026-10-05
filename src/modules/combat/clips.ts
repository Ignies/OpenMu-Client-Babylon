// The attack and cast clips of objects in view, and the sounds that go with them: what a swing or a
// cast packet plays on another player, a monster or a trap. The skills module's handlers reuse them.
import { clipCastSound, hasClipSound, playCombat } from '@/controllers/sound/combat';
import { type AttackPose } from '@/controllers/actors/weaponClass';
import { CharacterClassNumber } from '@/core/types';
import { Entity } from '@/ecs/world';
import { KEEP_CLIP, isMonsterSwingClip, monsterAreaCast, monsterAttackState, monsterCast, monsterCastAttacks, monsterCastRewinds, playableMonsterClip, type MonsterAttackInput } from '@/controllers/anim/monsterAttackClip';
import { METEORITE_STORM, meteoriteStormRunning, monsterCastQuiet, trapAttackSound } from '@/controllers/sound/packetSounds';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';

import { Hero } from '@/modules/hero';
import { Ecs } from '@/ecs/current';
import { TRAP_MODEL_TABLE, heldWeapons } from '@/controllers/actors';
import { advancesSwordCount, chooseSkillAction } from '../skills/skillCasting';
import { getBaseClass } from '../hero/characterStats';
import { isDeadMonster } from '../scope/objects';
import { isFemaleClass } from '@/controllers/actors/mapPlayerNetClassToModelClass';
import { isPlayerBody } from '@/controllers/actors/playerObject';
import { isWingItem } from '@/controllers/actors/wings';
import { monsterModelTypeOf } from '@/controllers/anim/playSpeed';
import { mountKind } from '@/controllers/pets';
import { playSfx } from '@/controllers/sound/sfx';
import { playSkill } from '@/controllers/sound';
import { castQuietOn, othersSeeClip, skillClip } from '@/controllers/combat/skillClips';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';

/**
 * What `SetPlayerAttack` reads off a character in scope. The hero builds the
 * same thing in AttackSystem; everyone else gets it here, so the swing a
 * player sees on his own screen is the swing his neighbours see.
 */
export function attackPoseOf(obj: Entity): AttackPose {
  const hands = obj.charAppearance;
  const inSafeZone = !!obj.attributeSystem?.isAboveZero('inSafeZone');
  return {
    hands: heldWeapons(obj, Ecs.world?.mapIndex ?? -1),
    baseClass: getBaseClass(hands?.charClass ?? Hero.charClass),
    swordCount: obj.playerAnimation?.swordCount ?? 0,
    wings: isWingItem(hands?.wings),
    mount: mountKind(hands?.pet, inSafeZone),
  };
}

/** `c->MonsterIndex`: a transformed player answers to the monster it wears. */
export function monsterNumberOf(obj: Entity): number {
  return obj.npcType ?? obj.skin ?? -1;
}

const monsterAttackInput: MonsterAttackInput = {
  world: 0,
  monster: -1,
  model: -1,
  trapObject: undefined,
  random: Math.random,
  now: 0,
};

/** What the monster attack hooks read off a character, in one reused record. */
export function attackInputOf(obj: Entity): MonsterAttackInput {
  const monster = monsterNumberOf(obj);
  monsterAttackInput.world = Ecs.world?.mapIndex ?? -1;
  monsterAttackInput.monster = monster;
  monsterAttackInput.model = monsterModelTypeOf(monster);
  monsterAttackInput.trapObject =
    obj.npcType === undefined ? undefined : TRAP_MODEL_TABLE[obj.npcType]?.[0];
  monsterAttackInput.now = performance.now();
  return monsterAttackInput;
}

/** `SetAction`; `rewind` is the `AnimationFrame = 0` that restarts a playing clip. */
export function setMonsterClip(obj: Entity, action: number, rewind: boolean) {
  const model = obj.modelObject;
  const clip = playableMonsterClip(action, model?.gltf?.animationGroups.length);
  if (clip === KEEP_CLIP || !obj.monsterAnimation) return;
  if (rewind && model?.CurrentAction === clip) model.restartAction();
  obj.monsterAnimation.action = clip as MonsterActionType;
}

/**
 * A trap's sounds after a pick: SetPlayerAttack's trap branch when it `attacked`, and the
 * meteorite storm once as it starts (`storming`: one already ran before the packet).
 */
export function playTrapSounds(
  obj: Entity,
  input: MonsterAttackInput,
  attacked: boolean,
  storming: boolean
) {
  const at = obj.transform?.pos;
  if (input.trapObject === undefined || !at) return;
  const trap = attacked ? trapAttackSound(input.trapObject) : undefined;
  if (trap) playSfx(trap.key, at, trap.opts);
  if (!storming && meteoriteStormRunning(input.monster, monsterAttackState(obj), input.now)) {
    playSfx(METEORITE_STORM.key, at, METEORITE_STORM.opts);
  }
}

/**
 * Cast clip for an object in scope: SetPlayerMagic for a player, and for a
 * monster the clip `ReceiveMagic` (0x19) or, for `area`, `ReceiveMagicContinue`
 * (0x1E) gives it.
 */
export function playCastAnimation(caster: Entity, skill: number, area: boolean) {
  const def = skillDefinition(skill);
  // A cast its skill drops on this mount (a Dark Horse rider's guard): no clip, no sound.
  if (
    !caster.localPlayer &&
    castQuietOn(skill, mountKind(caster.charAppearance?.pet, !!caster.attributeSystem?.isAboveZero('inSafeZone')))
  ) {
    return;
  }
  // ExecuteSkill's cast sound for everyone else (the hero's plays in SkillCastSystem).
  // Teleport never comes here: playTeleportAnimation plays it, the Nightmare's own sound included.
  if (!caster.localPlayer && caster.transform) {
    if (
      // A player's cast whose sound goes with its clip sounds below, once the clip is picked.
      !(caster.playerAnimation && hasClipSound(skill)) &&
      (caster.npcType === undefined ||
        !monsterCastQuiet(caster.npcType, monsterModelTypeOf(caster.npcType), skill))
    ) {
      playSkill(skill, caster.transform.pos);
    }
  }
  if (caster.playerAnimation) {
    if (caster.localPlayer) return; // SkillCastSystem already started the clip
    const cls =
      caster.charAppearance?.charClass ??
      (caster.attributeSystem?.getValue('playerNetClass') as CharacterClassNumber);
    // The same context the hero's cast builds: mount (none in a safe zone),
    // IsFemale(Class), the active world, and the coin toss for the male
    // hand cast - everyone in scope plays the same clip for the same skill.
    const ctx = {
      mount: mountKind(
        caster.charAppearance?.pet,
        !!caster.attributeSystem?.isAboveZero('inSafeZone')
      ),
      isFemale: isFemaleClass(cls),
      world: Ecs.world?.mapIndex,
      alternate: Math.random() < 0.5,
    };
    // A skill the server has no definition for still plays its own clip (Lightning Orb, 216).
    let action = def
      ? chooseSkillAction(def, attackPoseOf(caster), ctx)
      : (skillClip(skill, ctx) ?? PlayerAction.PLAYER_SKILL_HAND1);
    // What others see of the clip, when the skill says it differs (Electric Spike from a horse).
    action = othersSeeClip(skill, action);
    const paired = clipCastSound(skill, action);
    if (paired && caster.transform) playCombat(paired, caster.transform.pos);
    if (def && advancesSwordCount(def, ctx)) {
      caster.playerAnimation.swordCount = (caster.playerAnimation.swordCount ?? 0) + 1;
    }
    // SetPlayerMagic then `so->AnimationFrame = 0`; a monster body plays casts on its attack clips.
    const model = caster.modelObject;
    if (
      model &&
      (isPlayerBody(model)
        ? caster.playerAnimation.action === action
        : isMonsterSwingClip(model.CurrentAction))
    ) {
      model.restartAction();
    }
    caster.playerAnimation.action = action;
    if (caster.pathfinding) caster.pathfinding.path = null;
  } else if (caster.monsterAnimation && !isDeadMonster(caster)) {
    const state = monsterAttackState(caster);
    const input = attackInputOf(caster);
    const storming = meteoriteStormRunning(input.monster, state, input.now);
    if (area) setMonsterClip(caster, monsterAreaCast(state, skill, input), true);
    else setMonsterClip(caster, monsterCast(state, skill, input), monsterCastRewinds(skill));
    playTrapSounds(caster, input, area || monsterCastAttacks(skill), storming);
  }
}
