import { FIRE_TRAIL, MODEL, SHINY_GLINT, TEX } from '@/controllers/fx/recipes';
import type { ParticleRecipe, RGB } from '@/controllers/fx';
import type { ArrowFlight } from '@/controllers/skills/visuals';

/**
 * What each arrow model does while it flies, keyed by model like the original's `MoveEffect` cases
 * (ZzzEffect.cpp creation :1195-1350, :1116-1185; per frame Behaviors/MoveHandlers.cpp:4405-4900, :5221).
 * Units: `Scale` as the original, `roll` in rad/s from degrees a tick, rates per second from per-tick calls.
 */

const degPerTick = (d: number): number => (d * Math.PI) / 180 / 0.04;
const PER_TICK = 25;
const cm = (n: number): number => n / 100;

/** A flat card for one tick: a `CreateSprite` / `CreateParticle` redrawn at the head every frame (side = px x Scale, in cm). */
const card = (texture: string, colour: RGB, size: number, life = 0.05): ParticleRecipe => ({ texture, colour, size, life, power: 0, gravity: 0, fade: [[0, 1], [1, 1]], spin: 3 });

/** BITMAP_FIRE sub0 every frame, Light (0.8, 0.5, 0.2) x Luminosity (:4487-4535); LT 24, Scale 1.3-1.9 shrinking 0.04 a tick. */
const ARROW_FIRE: ParticleRecipe = { ...FIRE_TRAIL, colour: [0.8, 0.5, 0.2], size: 0.8, life: 0.96, endScale: 0.3 };
/** BITMAP_FLOWER01 + rand(3), 4 a frame (:4556-4571): Scale 0.12-0.33 of the sheet, LT 15-24, scattered +-16 x +-32 x +-16 cm. */
const PETALS: ParticleRecipe = { texture: TEX.flower, colour: [1, 1, 1], size: 0.16, sizeJitter: 0.5, life: 0.8, lifeJitter: 0.25, box: [0.16, 0.32, 0.16], power: 0.5, gravity: -0.5, spin: 2 };
/** BITMAP_LIGHTNING + 1 sprites at 0.5 and 1.0 of its 128 px sheet (:4552-4553). */
const LIGHTNING_GLOWS: readonly ParticleRecipe[] = [card(TEX.lightning2, [1, 1, 1], 0.64), card(TEX.lightning2, [1, 1, 1], 1.28)];
/** BITMAP_FLARE sub5 x3 every other frame, Light (0.4, 0.2, 1), Scale 0.2 (:4590-4597): the lace arrow's violet motes. */
const LACE_MOTES: ParticleRecipe = { texture: TEX.flare, colour: [0.4, 0.2, 1], size: 0.13, life: 0.6, box: [0.16, 0.32, 0.16], power: 0.6, gravity: -1.5 };
/** BITMAP_BUBBLE sub1 x4 a frame, scattered +-8 cm (:4610-4616): Scale 0.12-0.27 of the sheet, LT 30-39. */
const BUBBLES: ParticleRecipe = { texture: TEX.flare, colour: [0.6, 0.8, 0.8], size: 0.12, sizeJitter: 0.4, life: 1.4, box: [0.08, 0.08, 0.08], power: 0.2, gravity: 0.3 };
/** BITMAP_SMOKE sub0 behind the Bluewing bolt (:4618). */
const WING_SMOKE: ParticleRecipe = { texture: TEX.smoke, colour: [0.6, 0.8, 0.8], size: 0.4, life: 0.64, power: 0, gravity: 1.2, endScale: 2.2, spin: 1 };
/** BITMAP_SPARK + 1 sub30 x2 and BITMAP_SMOKE sub24 a frame, Light (0.2, 0.8, 0.5) (:6660-6676). */
const GAMBLE_SPARKS: ParticleRecipe = { texture: TEX.spark3, colour: [0.2, 0.8, 0.5], size: 0.14, life: 0.5, box: [0.16, 0.32, 0.16], power: 0.8, gravity: -1 };
const GAMBLE_SMOKE: ParticleRecipe = { texture: TEX.smoke, colour: [0.2, 0.8, 0.5], size: 0.45, life: 0.8, power: 0, gravity: 0.6, endScale: 2, spin: 1 };
/** BITMAP_SMOKE sub13 x3 a frame on the drill (:5233-5235). */
const DRILL_SMOKE: ParticleRecipe = { texture: TEX.smoke, colour: [1, 1, 1], size: 0.4, life: 0.8, power: 0, gravity: 0.8, endScale: 2.2, spin: 1 };
/** The white BITMAP_SPARK + 1 flash of the joint 14, 32 px x 5 (ZzzEffectJoint.cpp:6101). */
const SPARK_FLASH = card(TEX.spark3, [1, 1, 1], 1.6);
/** BITMAP_SHINY sub3 x2 a frame on the joint 15, Light (0.4, 0.9, 0.5) (ZzzEffectJoint.cpp:6106). */
const RING_SHINE: ParticleRecipe = { ...SHINY_GLINT, colour: [0.4, 0.9, 0.5], size: 0.2, life: 0.4 };

/** The BITMAP_FLARE + 1 sheet, two ribbons of 16 tails (ZzzEffectJoint.cpp:2205-2231). */
const flareJoint = (colour: RGB, width: number, maxTails = 16): ArrowFlight['joint'] => ({ colour, width: cm(width), maxTails, texture: TEX.flare2 });
/** BITMAP_JOINT_ENERGY sub5: Light (0.5, 0.1, 1), 10 tails, Scale 100 (ZzzEffectJoint.cpp:262-275, :454). */
const ENERGY_JOINT: ArrowFlight['joint'] = { colour: [0.5, 0.1, 1], width: cm(100), maxTails: 10, texture: TEX.jointEnergy };

/**
 * MODEL_ARROW_HOLY sub0 (Celestial Bow): LT 30, no body (ZzzEffect.cpp:1153-1188, :7997). Four BITMAP_FLARE sub11
 * joints (ZzzEffectJoint.cpp:1971-1977, :5609-5707): Light (0.2, 0.2, 1), 15 tails, Scale 30, 30 ticks, falling
 * from 150 cm onto the muzzle, with 25 cm of drift.
 */
const HOLY_SWIRL: NonNullable<ArrowFlight['swirl']> = { count: 4, colour: [0.2, 0.2, 1], width: cm(30), maxTails: 15, texture: TEX.flare2, radius: cm(150), seconds: 30 * 0.04, wobble: cm(25) };

export const ARROW_FLIGHTS: Partial<Record<string, ArrowFlight>> = {
  // The light stays at StartPosition, (0.2, 0.4, 1) x Luminosity, range 2 (Behaviors/MoveHandlers.cpp:4448-4482).
  [MODEL.arrowHoly]: { bodiless: true, lightAtStart: true, swirl: HOLY_SWIRL },
  // MODEL_ARROW: BlendMesh 1, Scale 0.8, a fire puff a frame.
  [MODEL.arrow]: { scale: 0.8, puffs: [{ recipe: ARROW_FIRE, rate: PER_TICK }] },
  // MODEL_ARROW_STEEL / SAW: nothing but the body (BlendMesh -1); THUNDER / LASER / V: BlendMesh 0.
  [MODEL.arrowSteel]: { scale: 0.8 },
  [MODEL.arrowSaw]: { scale: 0.8 },
  [MODEL.arrowThunder]: { scale: 0.8 },
  [MODEL.arrowLaser]: { scale: 0.8 },
  [MODEL.arrowV]: { scale: 0.8 },
  // MODEL_ARROW_NATURE sub0: spins 30 a frame, two glows and four petals.
  [MODEL.arrowNature]: {
    scale: 0.8,
    roll: degPerTick(30),
    puffs: [...LIGHTNING_GLOWS.map(recipe => ({ recipe, rate: PER_TICK })), { recipe: PETALS, rate: 4 * PER_TICK }],
  },
  // MODEL_ARROW_WING: Scale 1.8, BlendMesh 0, glows, bubbles and smoke.
  [MODEL.arrowWing]: {
    scale: 1.8,
    puffs: [...LIGHTNING_GLOWS.map(recipe => ({ recipe: { ...recipe, colour: [0.6, 0.8, 0.8] as RGB }, rate: PER_TICK })), { recipe: BUBBLES, rate: 4 * PER_TICK }, { recipe: WING_SMOKE, rate: PER_TICK }],
  },
  // MODEL_ARROW_IMPACT (Starfall's): Scale 1.8 (ZzzEffect.cpp:3755-3770); its tumble and the BITMAP_FLASH joints are not ported.
  [MODEL.arrowImpact]: { scale: 1.8 },
  // MODEL_ARROW_BOMB: Scale 1, BlendMesh 0, two BITMAP_LIGHT glows (1.0 and 2.0) and four bubbles (Move_MODEL_ARROW_BOMB :4786).
  [MODEL.arrowBomb]: { scale: 1, puffs: [{ recipe: card(TEX.flare, [1, 0.6, 0.4], 0.64), rate: PER_TICK }, { recipe: card(TEX.flare, [1, 0.6, 0.4], 1.28), rate: PER_TICK }, { recipe: BUBBLES, rate: 4 * PER_TICK }] },
  // MODEL_LACEARROW: BlendMesh 1, spins 60, joint 12 (Light 0.6 0.2 0.8, Scale 40), violet motes.
  [MODEL.laceArrow]: { scale: 0.8, roll: degPerTick(60), joint: { ...flareJoint([0.6, 0.2, 0.8], 40), seconds: 80 * 0.04 }, puffs: [{ recipe: LACE_MOTES, rate: 1.5 * PER_TICK }] },
  // MODEL_ARROW_SPARK: Scale 1, spins 35, joint 14 (white, Scale 50) and its flash.
  [MODEL.arrowSpark]: { scale: 1, roll: degPerTick(35), joint: flareJoint([1, 1, 1], 50), puffs: [{ recipe: SPARK_FLASH, rate: PER_TICK }] },
  // MODEL_ARROW_RING: BlendMesh 0, Scale 1, joint 15 (Light 0.4 0.9 0.5, Scale 50) and its shine.
  [MODEL.arrowRing]: { scale: 1, joint: flareJoint([0.4, 0.9, 0.5], 50), puffs: [{ recipe: RING_SHINE, rate: 2 * PER_TICK }] },
  // MODEL_ARROW_DARKSTINGER: Scale 0.8, joint 18 (Light 0.4 0.4 0.9, 7 tails, Scale 90) and two BITMAP_LIGHT glows (:4817-4900).
  [MODEL.arrowDarkStinger]: {
    scale: 0.8,
    joint: flareJoint([0.4, 0.4, 0.9], 90, 7),
    puffs: [{ recipe: card(TEX.flare, [0.6, 0.7, 0.9], 1.92), rate: PER_TICK }, { recipe: card(TEX.flare, [0.6, 0.7, 0.9], 1.28), rate: PER_TICK }],
  },
  // MODEL_ARROW_GAMBLE: Scale 0.8, spins 60, sparks and smoke.
  [MODEL.arrowGamble]: { scale: 0.8, roll: degPerTick(60), puffs: [{ recipe: GAMBLE_SPARKS, rate: 2 * PER_TICK }, { recipe: GAMBLE_SMOKE, rate: PER_TICK }] },
  // MODEL_ARROW_DOUBLE / BEST_CROSSBOW: Scale 1, spin 30 / 30-90, the violet energy ribbon.
  [MODEL.arrowDouble]: { scale: 1, roll: degPerTick(30), joint: ENERGY_JOINT },
  [MODEL.arrowBestCrossbow]: { scale: 1, roll: degPerTick(60), joint: ENERGY_JOINT },
  // MODEL_ARROW_DRILL: Scale 1, spins 30, the energy ribbon and three smoke puffs a frame.
  [MODEL.arrowDrill]: { scale: 1, roll: degPerTick(30), joint: ENERGY_JOINT, puffs: [{ recipe: DRILL_SMOKE, rate: 3 * PER_TICK }] },
};
