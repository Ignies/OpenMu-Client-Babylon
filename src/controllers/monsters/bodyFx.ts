/**
 * `MonsterDef.bodyFx`: what a monster's body throws off or carries while in scope
 * (`MoveCharacterVisual`, ZzzCharacter.cpp:5583), one emitter per `CreateParticle` line. Pure
 * data: particles and textures are names the fx controller resolves (`fx/monsterVisuals.ts`).
 */

/** The particle recipes a body emitter can name. */
export type BodyParticle = 'bodySmoke' | 'energyChips' | 'firePuff' | 'flameLick' | 'sandSmoke' | 'sandSmokeBurst';

/** The card textures a halo or mark can name. */
export type BodyTexture = 'flare' | 'magicGround2' | 'gmAurora';

/** A box in the original's centimetres: `rand() % (2x) - x` each way, `z` up. */
type Cm3 = readonly [number, number, number];
type RGB = readonly [number, number, number];

export type BodyFxGate = {
  /** `o->CurrentAction` is one of these (`MonsterActionType`). */
  readonly action?: readonly number[];
  /** ...and `o->AnimationFrame` sits in one of these `[from, to)` windows. */
  readonly frames?: readonly (readonly [number, number])[];
  /** `c->Dead == 0`. */
  readonly alive?: boolean;
};

export type BodyFxEmitter =
  | {
      /** `CreateParticle` at the body origin plus a random box. */
      readonly kind: 'body';
      readonly every: number;
      readonly recipe: BodyParticle;
      readonly box: Cm3;
      /** Puffs per passing tick (the `for (i < 20)` of the sand cloud). */
      readonly count?: number;
      readonly colour?: RGB;
      /** The sheet Devias uses instead (`WorldActive == WD_2DEVIAS`). */
      readonly devias?: BodyParticle;
      readonly gate?: BodyFxGate;
    }
  | {
      /** `CreateParticle` at `TransformPosition(BoneTransform[bone], local)`. */
      readonly kind: 'bone';
      readonly every: number;
      readonly recipe: BodyParticle;
      readonly bone: number;
      readonly local?: Cm3;
      /** The call's `Scale`, on the recipe's card. */
      readonly scale?: number;
      readonly colour?: RGB;
      readonly gate?: BodyFxGate;
    }
  | {
      /** `count` x `CreateParticle` at `BoneTransform[rand() % NumBones]`. */
      readonly kind: 'bones';
      readonly every: number;
      readonly count: number;
      readonly recipe: BodyParticle;
      readonly colour?: RGB;
      readonly gate?: BodyFxGate;
    }
  | {
      /** `CreatePointer(BITMAP_BLOOD, origin ± scatter)` on the floor. */
      readonly kind: 'blood';
      readonly every: number;
      readonly scatterCm: number;
    }
  | {
      /** `CreateJoint(BITMAP_JOINT_THUNDER, bone, bone)` pairs, kept alive. */
      readonly kind: 'bolts';
      readonly pairs: readonly (readonly [number, number])[];
    }
  | {
      /** `c->Appear`: the arrival dust and stones for the first ticks in scope. */
      readonly kind: 'appear';
      readonly ticks: number;
    }
  | {
      /** `CreateSprite(BITMAP_*, o->Position + (0,0,height), size, Light, o)`: a card the body carries. */
      readonly kind: 'halo';
      readonly texture: BodyTexture;
      readonly colour: RGB;
      /** `Scale` of the call, in the card edge the sprite layer takes. */
      readonly size: number;
      /** Height over the character's feet, in cm. */
      readonly heightCm: number;
    }
  | {
      /** `RenderTerrainAlphaBitmap(BITMAP_*, ...)`: a mark redrawn under the character every frame. */
      readonly kind: 'mark';
      readonly texture: BodyTexture;
      readonly colour: RGB;
      /** `sx` of the call, which is already in tiles. */
      readonly tiles: number;
      /** Degrees a second. The original's marks turn on `WorldTime * 0.01`. */
      readonly spin: number;
    }
  | {
      /**
       * The smith's and the trader's anvil: `tries` x per tick, each `CreateJoint(BITMAP_JOINT_SPARK,
       * p, p, Angle)` and, with `chip` odds, a `BITMAP_SPARK` chip. `Angle` is `(pitch, 0, yaw)` in
       * the original's degrees.
       */
      readonly kind: 'sparks';
      readonly every: number;
      readonly tries: number;
      readonly bone: number;
      readonly local?: Cm3;
      readonly pitch: readonly [number, number];
      readonly yaw: readonly [number, number];
      readonly chip: number;
      readonly gate?: BodyFxGate;
    };

/** One monster's body effects. */
export type MonsterBodyFx = readonly BodyFxEmitter[];
