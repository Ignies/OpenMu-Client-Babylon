/**
 * `MonsterDef.bodyFx`: what a monster's body throws off or carries while in scope
 * (`MoveCharacterVisual`, ZzzCharacter.cpp:5583), one emitter per `CreateParticle` line. Pure
 * data: particles and textures are names the fx controller resolves (`fx/monsterVisuals.ts`).
 */

/** The particle recipes a body emitter can name. */
export type BodyParticle = 'bodySmoke' | 'energyChips' | 'firePuff' | 'flameLick' | 'sandSmoke' | 'sandSmokeBurst';

/** The card textures a halo or mark can name. */
export type BodyTexture = 'flare' | 'magicGround2' | 'gmAurora';

/** The sheets a `cards` row can name (`CreateSprite(BITMAP_*)`). */
export type BodyCard =
  | 'light'
  | 'lightRed'
  | 'lightMarks'
  | 'shockWave'
  | 'shiny2'
  | 'shiny6'
  | 'energy'
  | 'flareBlue'
  | 'flareRed'
  | 'flare2'
  | 'eventCloud'
  | 'hole';

/** The sheets a `blur` can draw: CreateBlur's `Type` 0 (BITMAP_BLUR, blur01) or 3 (BITMAP_BLUR2, blur02). */
export type BodyBlurSheet = 'blur01' | 'blur02';

/** The sheets a `trail` can run: BITMAP_JOINT_ENERGY (JointLaser01) or BITMAP_FLARE (its SubType 28-33 TexType). */
export type BodyRibbon = 'jointEnergy' | 'flare';

/** The original's own particles a `puff` can name (`fx/effectParticles.ts` kinds, by `BITMAP_*` and SubType). */
export type BodyPuff =
  | 'fire1'
  | 'fire2'
  | 'fire3'
  | 'smoke1'
  | 'smoke13'
  | 'smoke17'
  | 'smoke21'
  | 'smoke50'
  | 'smokeLine1'
  | 'smokeLine2'
  | 'smokeLine3'
  | 'trueFire'
  | 'fireMono1_4'
  | 'fireMono2_8'
  | 'fireMono3_5'
  | 'waterfall4Orbit0'
  | 'waterfall4Orbit1'
  | 'waterfall4Orbit2';

/** One `CreateSprite` on a bone: `TransformPosition(BoneTransform[bone], local)`. */
export type BodyCardSpot = {
  readonly bone: number;
  readonly card: BodyCard;
  /** The call's `Scale`: the sheet's pixels times this, in cm. */
  readonly scale: number;
  readonly local?: Cm3;
  /** The call's `Rotation` as degrees a `WorldTime` ms (`(int)WorldTime * 0.08f`). */
  readonly spin?: number;
};

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
  /** `g_isCharacterBuff(o, buff)`: it carries this `eBuffState` (the Imperial Guardian bosses' Berserker, 81). */
  readonly buff?: number;
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
    }
  | {
      /**
       * `CreateSprite` on bones every frame (`RenderMonsterVisual`): steady cards in one light,
       * `sin(WorldTime * speed) * amount + base` when it `pulse`s. `alive`: not drawn once it dies.
       */
      readonly kind: 'cards';
      readonly spots: readonly BodyCardSpot[];
      readonly colour: RGB;
      readonly pulse?: { readonly speed: number; readonly amount: number; readonly base: number };
      /** A `Scale` of `scale + sin(WorldTime * speed) * amount`. */
      readonly swell?: { readonly speed: number; readonly amount: number };
      /** `sin(WorldTime * speed) * amount + base` added to each channel of the light. */
      readonly lift?: { readonly speed: number; readonly amount: number; readonly base: number };
      /** Its `Scale` times the Shock roar's `fRoar` (Kundun, GMHellas.cpp:1596-1622). */
      readonly roar?: true;
      /** `alive`: not drawn once it dies; `action` / `frames`: drawn only then (a `MoveMonsterVisual` CreateSprite). */
      readonly gate?: Pick<BodyFxGate, 'alive' | 'action' | 'frames'>;
    }
  | {
      /**
       * A `CreateJoint(BITMAP_JOINT_ENERGY, ...)` whose head rides a bone (`Velocity` 0, the eye and bone
       * SubTypes, ZzzEffectJoint.cpp:415-439, :3149-3159): the ribbon is where the bone has been.
       */
      readonly kind: 'trail';
      readonly bone: number;
      /** The joint's `Scale`, its width in cm. */
      readonly widthCm: number;
      readonly maxTails: number;
      readonly colour: RGB;
      readonly ribbon?: BodyRibbon;
      readonly gate?: { readonly alive: true };
    }
  | {
      /**
       * `CreateBlur(c, TransformPosition(BoneTransform[from], fromLocal), TransformPosition(BoneTransform[to],
       * toLocal), Light, Type)` every frame the gate is open, as a monster's RenderObject loop does: one swing
       * trail, sampled 10 times a tick, that stops sampling and fades once the gate closes.
       */
      readonly kind: 'blur';
      readonly from: number;
      readonly to: number;
      readonly fromLocal?: Cm3;
      readonly toLocal?: Cm3;
      readonly colour: RGB;
      readonly sheet: BodyBlurSheet;
      readonly gate?: BodyFxGate;
    }
  | {
      /**
       * On a won roll, at each bone, one `CreateParticle(BITMAP_*, TransformPosition(bone, local), ..., Light,
       * SubType, Scale)` per entry; an entry of several picks one at random (`BITMAP_SMOKELINE1 + rand() % 3`).
       */
      readonly kind: 'puff';
      readonly every: number;
      readonly particles: readonly (BodyPuff | readonly BodyPuff[])[];
      readonly bones: readonly number[];
      /** Each bone rolls its own 1/`every` (the `for (i < NumBones) if (rand() % 6 > 0) continue` walks). */
      readonly rollEach?: boolean;
      /** Each entry's own `Scale`, aligned with `particles`, in place of `scale`. */
      readonly scales?: readonly number[];
      /** `rand() % (2x) - x` cm off the bone on each axis, a spawn. */
      readonly jitterCm?: number;
      readonly local?: Cm3;
      readonly scale?: number;
      readonly colour: RGB;
      /** Its `Scale` times the Shock roar's `fRoar`. */
      readonly roar?: true;
      /** Made on the monster's `Angle`, so a push goes the way it faces. */
      readonly turned?: true;
      /** What the particles ride (`o->Target`): the monster's position or the bone they were made at. */
      readonly ride?: 'body' | 'bone';
      readonly gate?: BodyFxGate;
    };

/** One monster's body effects. */
export type MonsterBodyFx = readonly BodyFxEmitter[];
