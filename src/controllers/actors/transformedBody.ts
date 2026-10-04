import { PlayerObject } from './playerObject';
import type { ModelObject } from '../render/modelObject';
import type { ItemVisualTier } from '../item_fx/itemVisualTier';
import { skeletonShatter } from '../fx/deathVisuals';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import {
  isPlayerAttackAction,
  isPlayerSkillAction,
} from '../anim/playerActionMapper';
import { TRANSFORMED_NPC_TABLE } from './playerNpcTables';

/**
 * A character wearing something else's body: `c->Object.SubType = MODEL_X`,
 * which makes `RenderCharacter` draw the one part file the subtype names in
 * place of the whole equipment body (ZzzCharacter.cpp:9345-9440).
 *
 * Only the body goes. The rig, the clips, the weapons, the wings and the pet
 * are all outside that branch and keep being drawn as they were - which is
 * exactly why the hero can wear one: nothing about how it walks, fights or
 * is driven changes, only what is on screen.
 */

/** The five sockets the transform part stands in for. */
function isBodySocket(model: PlayerObject, socket: ModelObject): boolean {
  return (
    socket === model.Helm ||
    socket === model.HelmMask ||
    socket === model.Armor ||
    socket === model.Pants ||
    socket === model.Gloves ||
    socket === model.Boots
  );
}

const cache = new Map<string, typeof PlayerObject>();

/**
 * A `PlayerObject` subclass that wears `dir/part` as its whole body.
 *
 * The one seam is `loadPartAsync`, because the body is written to from two
 * directions - the class defaults the model sets up for itself, and the
 * equipment AppearanceSystem puts on afterwards - and a transform has to
 * survive both. Taking it there covers them together: the part lands on the
 * Armor socket whichever of them asked, and the other four stay empty.
 */
export function transformedBodyFactory(
  dir: string,
  part: string
): typeof PlayerObject {
  const key = `${dir}${part}`;
  const cached = cache.get(key);
  if (cached) return cached;

  class TransformedBody extends PlayerObject {
    /**
     * `o->SubType` in MODEL_SKELETON1..3 dies as a bone shatter whatever is
     * wearing it - the death branch tests the subtype, not the kind
     * (ZzzCharacter.cpp:1406-1410), so a character in an Elite Skeleton ring
     * comes apart the same way the monster does.
     */
    static DeathShatter = /^Skeleton0[123]\.glb$/.test(part)
      ? skeletonShatter
      : null;

    override async loadPartAsync(
      partDir: string,
      socket: ModelObject,
      modelPath: string,
      itemLvl?: number,
      isExcellent?: boolean,
      tier?: ItemVisualTier
    ) {
      if (!isBodySocket(this, socket)) {
        return super.loadPartAsync(
          partDir,
          socket,
          modelPath,
          itemLvl,
          isExcellent,
          tier
        );
      }

      if (socket !== this.Armor) {
        socket.Unload();
        return;
      }

      await super.loadPartAsync(dir, this.Armor, part);
    }
  }

  Object.defineProperty(TransformedBody, 'name', {
    value: part.replace(/\.glb$/, ''),
  });

  cache.set(key, TransformedBody);

  return TransformedBody;
}

/**
 * The transformation skins that are a body part: a `MODEL_PLAYER` with a
 * subtype in the original, so the swap above is all any of them takes.
 *
 * `TRANSFORMED_NPC_TABLE` is the same set as seen from the NPC side; the
 * Skeleton Warrior is listed here as well because as a monster it is drawn
 * through its own factory (`_skeleton_line/model.ts`), weapons and all.
 * Read when asked, not at load: the table is the monster folders'.
 */
export function characterSkinParts(): Readonly<
  Record<number, readonly [dir: string, part: string, scale: number]>
> {
  return {
    ...TRANSFORMED_NPC_TABLE,
    // MONSTER_SKELETON_WARRIOR: MODEL_SKELETON1 at Scale 0.95
    // (ZzzCharacter.cpp:14183-14192).
    14: ['Skill/', 'Skeleton01.glb', 0.95],
  };
}

/**
 * The monster clip that stands in for a character's action while it wears a
 * monster's body. The original has no mapping to make - a transformed
 * character *is* a monster object over there, and `MoveCharacter` puts it in
 * MONSTER01_STOP1 / _WALK, its attacks in MONSTER01_ATTACK1 and its death in
 * MONSTER01_DIE like any other. This is those same five states, read off the
 * character's own action.
 */
export function monsterClipFor(
  action: PlayerAction,
  moving: boolean
): MonsterActionType {
  if (action === PlayerAction.PLAYER_DIE1) return MonsterActionType.Die;
  if (action === PlayerAction.PLAYER_SHOCK) return MonsterActionType.Shock;
  if (isPlayerAttackAction(action) || isPlayerSkillAction(action)) {
    return MonsterActionType.Attack1;
  }
  return moving ? MonsterActionType.Walk : MonsterActionType.Stop1;
}
