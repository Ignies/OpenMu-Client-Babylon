import type { ModelObject } from '../render/modelObject';
import { isKnownObjectType, resolveModelFactory } from './modelFactoryPerId';
import { characterSkinParts, transformedBodyFactory } from './transformedBody';

/**
 * `o->Scale` the transform packet overrides whatever the monster's own table
 * says: a Giant worn by a character is drawn at half the size of the Giant
 * that walks Tarkan (`ReceiveCreateTransformViewport`, WSclient.cpp:2768).
 */
const SKIN_SCALE: Readonly<Record<number, number>> = { 7: 0.8 };

type SkinBody = {
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
 * (`characterSkinParts`); the rest - Budge Dragon, Giant, Poison Bull
 * Fighter, Thunder Lich, Death Cow, Snowman - are the monster's own model,
 * which is how the original draws them too: `ReceiveCreateTransformViewport`
 * builds the transformed character with `CreateMonster` and lets it play the
 * monster's clips (WSclient.cpp:2760-2800).
 */
export function characterSkinBody(skin: number): SkinBody | null {
  const entry = characterSkinParts()[skin];
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
