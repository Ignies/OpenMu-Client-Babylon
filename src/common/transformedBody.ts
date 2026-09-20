import { PlayerObject } from './playerObject';
import type { ModelObject } from './modelObject';
import type { ItemVisualTier } from './itemVisualTier';
import { skeletonShatter } from './deathVisuals';
import { isKnownObjectType, resolveModelFactory } from './modelFactoryPerId';
import { MonsterActionType, PlayerAction } from './objects/enum';
import {
  isPlayerAttackAction,
  isPlayerSkillAction,
} from './playerActionMapper';
import { TRANSFORMED_NPC_TABLE } from './npcs/playerNpcTables';

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
 * through its own factory (`monsters/skeletonWarrior.ts`), weapons and all.
 */
export const CHARACTER_SKIN_PARTS: Readonly<
  Record<number, readonly [dir: string, part: string, scale: number]>
> = {
  ...TRANSFORMED_NPC_TABLE,
  // MONSTER_SKELETON_WARRIOR: MODEL_SKELETON1 at Scale 0.95
  // (ZzzCharacter.cpp:14183-14192).
  14: ['Skill/', 'Skeleton01.glb', 0.95],
};

/**
 * `o->Scale` the transform packet overrides whatever the monster's own table
 * says: a Giant worn by a character is drawn at half the size of the Giant
 * that walks Tarkan (`ReceiveCreateTransformViewport`, WSclient.cpp:2768).
 */
const SKIN_SCALE: Readonly<Record<number, number>> = { 7: 0.8 };

export type SkinBody = {
  /**
   * A part file worn on the character's own rig, or a whole monster with a
   * rig of its own. The second kind has none of a character's clips, so
   * whoever wears one has its actions translated (`monsterClipFor`).
   */
  kind: 'part' | 'monster';
  factory: typeof ModelObject;
  scale: number;
};

/**
 * The body a transformation skin is drawn as. Half of them are part files
 * (`CHARACTER_SKIN_PARTS`); the rest - Budge Dragon, Giant, Poison Bull
 * Fighter, Thunder Lich, Death Cow, Snowman - are the monster's own model,
 * which is how the original draws them too: `ReceiveCreateTransformViewport`
 * builds the transformed character with `CreateMonster` and lets it play the
 * monster's clips (WSclient.cpp:2760-2800).
 */
export function characterSkinBody(skin: number): SkinBody | null {
  const entry = CHARACTER_SKIN_PARTS[skin];
  if (entry) {
    return {
      kind: 'part',
      factory: transformedBodyFactory(entry[0], entry[1]),
      scale: entry[2],
    };
  }

  if (!isKnownObjectType(skin)) return null;

  const factory = resolveModelFactory(skin);
  const own = factory.OverrideScale >= 0 ? factory.OverrideScale : 1;

  return { kind: 'monster', factory, scale: SKIN_SCALE[skin] ?? own };
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
