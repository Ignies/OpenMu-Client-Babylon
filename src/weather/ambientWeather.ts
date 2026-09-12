import { Color4, Vector3 } from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import type { AmbientRecipe } from '../common/ambientParticles';
import type { AmbientSchedule } from './ambientSchedule';
import { maps } from '../maps';

/**
 * Ambient recipes for the GPU particle backbone, ported from the original's
 * `MoveLeaves` set (ZzzEffectFireLeave.cpp) plus our own tavern dust.
 *
 * The original ran ≤ 80 (200 in events) `Leaves[]` sprites around the hero
 * at 25 ticks/s; its units are MU (100 per tile), its axes Z-up. Converted
 * here: 1 MU unit/tick = 0.25 tiles/s, MU (x, y, z) → ours (x, z, y).
 *
 *  - **Lorencia leaves** (`CreateLorenciaLeaf`): spawn x ±800, y −500…+899,
 *    z +50…+349 around the hero; velocity x −6.4…−12.7 u/tick (toward −x,
 *    flipped past the camera), y/z ±1.6; per-tick random walk ±0.8, tumble
 *    from `TurningForce`; die 447 units from the start. Noria uses the same
 *    leaf.
 *  - **Atlans drift / bubbles**: `CreateAtlanseLeaf` is the Lorencia leaf's
 *    numbers copied line for line, but on World8's own round `leaf01` and
 *    drawn additively (`RenderLeaves`:507). Marine snow on a current, plus a
 *    bubble field the original leaves to its 845 vents. See `ATLANS_DRIFT`.
 *  - **Devias snow** (`CreateDeviasSnow`): z +200…+399, falling 8…23 u/tick
 *    tilted −30° about x, scale 5 (1 in 10 a big flake at 10, leaf02).
 *  - **Rain** (`CreateHeavenRain` / `CreateDevilSquareRain`): z +200…+399,
 *    speed 20…43 (+RainSpeed wobble) tilted −30…−50°, drawn as a 1×20
 *    plane along its angle — a stretched billboard here.
 *  - **Tavern dust**: slow golden motes inside the Lorencia pub volume.
 *
 * Three things keep a recipe from popping, and they are not interchangeable.
 * `fade` is per particle — the share of a leaf's own life spent fading in and
 * out, which is what stops a single sprite blinking into existence in mid-air.
 * `ramp` is per system — the seconds the *emit rate* takes to cross its whole
 * range, which is what stops the whole field arriving or leaving at once when
 * a gust starts or the hero steps under a roof. `growth` is per particle
 * again, and it is the one that carries a shower's *shape*: how big and how
 * fast a drop is at this strength, so that easing off makes the rain smaller
 * and slower and not merely sparser.
 *
 * The original settled leaves on the terrain (`MoveEtcLeaf`) and spawned a
 * `BITMAP_RAIN_CIRCLE` where a drop landed. A GPU particle still cannot read
 * the height map, so leaves end with a fade; rain no longer does — it is
 * given enough life to fall past the ground and is occluded by it, the same
 * trick `DEVIAS_SNOW` already used. The splash itself lives in the terrain
 * shader now, as rings on the standing water (`terrainOverlay.ts`), which is
 * the one place that *can* read the height map.
 */

/**
 * Maps whose sky belongs to snow. Rain must never fall on them however the
 * weather byte reads: it is established that snow is a property of the *map*
 * and never of the packet (`CreateDeviasSnow` gates on the world alone), while
 * the weather byte is global — the proxy computes one sky for every client and
 * cannot know which map anyone is standing on.
 */
export const SNOW_MAPS: ReadonlySet<ENUM_WORLD> = new Set(
  // Declared per map as `MapLayer.snow` (Devias; `g_Raklion.CreateSnow` on
  // both Ice City worlds; `g_SantaTown.CreateSnow` — ZzzEffectFireLeave.cpp:481-482).
  maps.worldsWhere(layer => layer.snow === true)
);

/**
 * Maps under water. Rain must never fall on them for the same reason it never
 * falls on a snow map: what the sky is doing is a property of the *map*, and
 * the weather byte is global - the proxy computes one sky for every client
 * and cannot know which map anyone is standing on. Twenty metres down the
 * question does not arise, and the lighting profile already agrees
 * (`lighting/profiles.ts` gives Atlans `sky: null`).
 *
 * The same flag is what puts the sea ambience on a map instead of leaves.
 */
export const UNDERWATER_MAPS: ReadonlySet<ENUM_WORLD> = new Set(
  maps.worldsWhere(layer => layer.underwater === true)
);

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

const WHITE = new Color4(1, 1, 1, 1);

/** Wind tilt of −30° about x: a unit "down" vector leaning along +z. */
const TILT_30 = v(0, -Math.cos(Math.PI / 6), Math.sin(Math.PI / 6));
const TILT_50 = v(
  0,
  -Math.cos((Math.PI * 50) / 180),
  Math.sin((Math.PI * 50) / 180)
);

/**
 * Weather comes in episodes, not as a permanent fixture: a gust of leaves
 * every minute or so, snow that thickens and thins. Both are rolled off the
 * shared clock (`ambientSchedule.ts`), so every client on the map sees the
 * same gust at the same second — the calm stretches are the point, a field
 * that always has leaves in it stops reading as wind.
 */
const LEAF_GUSTS: AmbientSchedule = {
  key: 'leafGust',
  period: 45,
  chance: 0.55,
  duration: [14, 34],
  strength: [0.4, 1],
  ramp: 4,
};

/**
 * A current, not a gust. Water has too much inertia to blow in bursts: it
 * swells and slackens over a couple of minutes and it is never quite still.
 * So this rolls nine slots in ten, runs for most of the slot it rolls, and
 * even its weakest episode peaks at three fifths of the rate.
 */
const SEA_CURRENTS: AmbientSchedule = {
  key: 'seaCurrent',
  period: 120,
  chance: 0.9,
  duration: [95, 120],
  strength: [0.6, 1],
  ramp: 12,
};

/** Snowfall is slower to arrive and outstays a gust. */
const SNOW_SQUALLS: AmbientSchedule = {
  key: 'snowSquall',
  period: 90,
  chance: 0.8,
  duration: [55, 90],
  strength: [0.35, 1],
  ramp: 9,
};

/**
 * Which way the wind blows, on the ground, as a unit vector in world xz.
 *
 * The leaves have always blown along -x (the recipe below, from the
 * original's own emitter). Exported because the grass has to lean the same
 * way: a field whose waves cross it in one direction while the leaves over
 * it fly in another is the kind of disagreement nobody can name but everyone
 * sees. One wind, two readers.
 */
export const GROUND_WIND: readonly [number, number] = [-1, 0];

export const LORENCIA_LEAVES: AmbientRecipe = {
  name: 'lorenciaLeaves',
  texture: 'World1/leaf01.OZT',
  blend: 'alpha',
  // 80 leaves alive at a time in the original. Count is rate x life, so the
  // longer life below is paid for by a proportionally lower rate: 14/s over
  // ~5.75 s is the same ~80 leaves in the air.
  rate: 14,
  capacity: 256,
  // Wider than the original's ±800 MU so the field has some depth to it: a
  // leaf that spawns 14 tiles upwind is still crossing the screen when it
  // reaches the hero, instead of blinking into existence beside them.
  box: [v(-14, 0.5, -10), v(14, 4, 12)],
  // −6.4…−12.7 u/tick along −x, ±1.6 sideways / vertical.
  direction: [v(-1, -0.25, -0.25), v(-1, 0.25, 0.25)],
  power: [1.6, 3.2],
  // The original's ~2 s killed a leaf in open air after nine tiles of travel,
  // which is the pop: it never reached the ground and never left the frame,
  // it just stopped existing. At 4.5-7 s a leaf crosses 12-22 tiles and is
  // out of shot before its time is up. It also sets the floor on how gently
  // a gust can die — a field cannot drain more slowly than its slowest leaf.
  life: [4.5, 7],
  size: [0.16, 0.24],
  angularSpeed: [-3, 3],
  colour: [WHITE, new Color4(0.92, 0.92, 0.9, 1)],
  // The ±0.8 u/tick² random walk.
  noise: v(1.2, 0.8, 1.2),
  // A leaf spawns and dies in open air with nothing to hide the transition,
  // so it spends a third of its life on each edge fading.
  fade: 0.35,
  ramp: 7,
  schedule: LEAF_GUSTS,
  skyBorne: true,
};

/**
 * Noria: the same fall, on the map's own art.
 *
 * `BITMAP_LEAF1` is `<WorldName>/leaf01` (MapManager.cpp:1474-1476), so every
 * map that sheds anything sheds its own. Noria's is a pink blossom petal;
 * Lorencia's is a cream dandelion puff on a brown stem, and that is what has
 * been blowing through the fairy forest - the same texture-follows-the-recipe
 * slip Atlans was pulled out of below.
 *
 * The motion is Lorencia's on purpose: `CreateAtlanseLeaf`
 * (ZzzEffectFireLeave.cpp:292-313) is `CreateLorenciaLeaf`'s spawn box and
 * velocity copied line for line, and Noria takes that path. The one
 * difference there is that Noria's copy forgets `FPS_ANIMATION_FACTOR` on the
 * velocity, which is a frame-rate bug in a fixed-tick client and nothing to
 * port.
 *
 * `RenderLeaves` (:507) leaves Noria on `EnableAlphaTest()` with
 * `glColor3f(1, 1, 1)`, so the petal is drawn at its own colour - no cream
 * variation over it, or the pink goes grey.
 */
export const NORIA_PETALS: AmbientRecipe = {
  ...LORENCIA_LEAVES,
  name: 'noriaPetals',
  texture: 'World4/leaf01.OZT',
  colour: [WHITE, WHITE],
};

/**
 * Atlans: what hangs in twenty metres of water, drifting on the current.
 *
 * The original wires Atlans into the leaf path (`CreateAtlanseLeaf`,
 * ZzzEffectFireLeave.cpp:292-313) with the Lorencia leaf's own spawn box and
 * velocity copied line for line, and this port copied the *recipe* too - so
 * Atlans has been running Lorencia's `World1/leaf01.OZT`, a cream dandelion
 * puff on a brown stem, blowing sideways across the seabed.
 *
 * Two things separate the original's Atlans from its Lorencia, and both were
 * lost in that copy. The texture is per world: `BITMAP_LEAF1` is
 * `<WorldName>/leaf01` (MapManager.cpp:1474-1476), and World8's is a soft
 * round grey blob, not a leaf. And `RenderLeaves` (:507) puts WD_7ATLANSE
 * on `EnableAlphaBlend()` - `glBlendFunc(GL_ONE, GL_ONE)`,
 * ZzzOpenglUtil.cpp:426, i.e. ADDITIVE - where Lorencia gets
 * `EnableAlphaTest()`. A dim round blob added over dark water is marine
 * snow, which is what the map wanted all along.
 *
 * The motion is the one place this leaves the original behind. 1.6-3.2
 * tiles/s is a gale, and water does not do gales: particulate is near enough
 * neutrally buoyant that it goes where the water goes and no faster. At
 * 0.35-0.9 tiles/s with a long life and a heavy wander, a mote crosses 3-10
 * tiles over its 7-12 s and looks suspended rather than blown.
 */
export const ATLANS_DRIFT: AmbientRecipe = {
  name: 'atlansDrift',
  texture: 'World8/leaf01.OZJ',
  blend: 'add',
  // ~26/s over ~9.5 s is ~250 motes in the air, against the leaves' 80.
  // They are half the size and a fraction of the brightness, so the number
  // is what makes the water look thick rather than littered.
  rate: 26,
  capacity: 448,
  // Taller than a leaf box. There is water above the hero as well as around
  // them, and nothing to fall out of.
  box: [v(-14, 0.2, -10), v(14, 6, 12)],
  // With the current along -x, the same way the leaves blow, with a slight
  // lift: what sinks has already sunk.
  direction: [v(-1, -0.1, -0.4), v(-1, 0.35, 0.4)],
  power: [0.35, 0.9],
  life: [7, 12],
  // 0.09-0.2 tiles is 8-18 px at the game camera. Smaller than this and an
  // additive mote of a 0.53-white sprite is sampled away the same way the
  // first cut of the rain was.
  size: [0.09, 0.2],
  angularSpeed: [-0.5, 0.5],
  // Additive, so this is the light a mote ADDS. Pale and cold: down here the
  // only light to catch is what the surface let through, and the map's grade
  // (ev 1.2, whiteBalance [0.94, 1, 1.04]) is already pulling blue.
  colour: [new Color4(0.85, 0.96, 1, 1), new Color4(0.5, 0.74, 0.88, 0.8)],
  // Heavier than the leaves' random walk and on all three axes: this is the
  // eddying that makes water read as water rather than as air.
  noise: v(1, 0.7, 1),
  fade: 0.3,
  ramp: 12,
  schedule: SEA_CURRENTS,
};

/**
 * Atlans: bubbles coming up out of the seabed.
 *
 * The original has no ambient bubble field - it has 845 type-22 vents, each
 * puffing for two seconds in four (`atlans/bubbleVentObject.ts`), and those
 * stay. This is the rest of the water column: the map is a sea floor, and a
 * sea floor gases off everywhere, not only where a vent was placed.
 *
 * Unscheduled, unlike the drift. A current swells and slackens; the seabed
 * does not stop venting, so there is nothing for a schedule to say.
 */
export const ATLANS_BUBBLES: AmbientRecipe = {
  name: 'atlansBubbles',
  texture: 'proc:bubble',
  blend: 'add',
  // Sparse on purpose: ~5/s over ~6.5 s is ~33 bubbles across a 24x20 tile
  // box. A bubble is an event you notice, and a field of them is a jacuzzi.
  rate: 5,
  capacity: 96,
  // Spawns at and below the hero's feet so a bubble is already climbing when
  // it enters the shot, and never appears in mid-frame.
  box: [v(-12, -1, -9), v(12, 1.5, 11)],
  direction: [v(-0.25, 1, -0.25), v(0.25, 1, 0.25)],
  power: [0.8, 1.8],
  life: [5, 8],
  // Big, and that is what pays for the sprite. `proc:bubble` is a thin rim
  // over a reflection gradient, and none of that survives being drawn at the
  // size of a mote - under ~25 px a bubble is a faint circle and nothing
  // more. 0.14-0.34 tiles is ~30-75 px at the game camera, where the rim,
  // the sheen and the gloss all read. Fewer and larger is the trade, and it
  // is the right way round: bubbles are things you can count.
  size: [0.14, 0.34],
  // Air accelerates as it rises. Small, but it is the difference between a
  // bubble and a mote going the other way.
  gravity: v(0, 0.25, 0),
  // No angularSpeed: the sprite is lit from one corner (see `proc:bubble`),
  // and a rotating highlight reads as a spinning marble.
  colour: [new Color4(0.72, 0.88, 0.95, 1), new Color4(0.5, 0.72, 0.85, 0.85)],
  // The wobble a climbing bubble has (`Position += (rand%20-10)*2.5*Scale`
  // on X/Y per tick, ZzzEffectParticle.cpp:4145): lateral, never vertical -
  // a bubble does not hesitate on its way up.
  noise: v(1.1, 0, 1.1),
  fade: 0.25,
  ramp: 6,
};

export const DEVIAS_SNOW: AmbientRecipe = {
  name: 'deviasSnow',
  texture: 'World3/leaf01.OZT',
  blend: 'alpha',
  // As with the leaves: life up, rate down by the same factor, so the number
  // of flakes in the air is unchanged.
  rate: 26,
  capacity: 512,
  box: [v(-14, 2, -10), v(14, 5, 12)],
  direction: [TILT_30, TILT_30],
  // 8…23 u/tick.
  power: [2, 5.75],
  // 1.2-2.2 s put a flake out at 3-12 tiles of fall — mid-air, above the
  // ground, in plain view. 3.5-6 s carries it to the terrain, where it goes
  // out of sight under the ground instead of out of existence in front of
  // the camera.
  life: [3.5, 6],
  size: [0.07, 0.11],
  colour: [WHITE, new Color4(0.9, 0.95, 1, 1)],
  noise: v(0.5, 0, 0.5),
  fade: 0.3,
  // Snowfall thickens and thins more slowly than a gust of leaves does.
  ramp: 9,
  schedule: SNOW_SQUALLS,
  skyBorne: true,
};

/**
 * One flake in ten was the big leaf02 sprite at double scale. Inherits
 * `SNOW_SQUALLS` through the spread, so the big flakes ride the same squall.
 */
export const DEVIAS_SNOW_BIG: AmbientRecipe = {
  ...DEVIAS_SNOW,
  name: 'deviasSnowBig',
  texture: 'World3/leaf02.OZJ',
  blend: 'add',
  rate: 3,
  capacity: 64,
  size: [0.16, 0.22],
};

export const RAIN: AmbientRecipe = {
  name: 'rain',
  // The original draws BITMAP_RAIN through EnableAlphaBlend(), which is
  // `glBlendFunc(GL_ONE, GL_ONE)` (ZzzOpenglUtil.cpp:426) - additive. Under
  // the straight-alpha blend this had, rain01's ~0.1 RGB drew as dark brown
  // streaks ("black rain"). The streak itself is generated (see
  // ambientParticles.ts): the data file is too dark to read additively.
  texture: 'proc:streak',
  blend: 'add',
  // Up from 900. The rate is scaled by the packet's intensity, and at the
  // proxy's lightest shower (4/15 → 0.24) 900 left ~100 drops on screen,
  // which was "is it raining?". Heavy rain hits the capacity either way.
  rate: 1500,
  // Up from 2048, paid for by the longer life below. Count is rate x life:
  // at the strongest the packet can ask for (0.9) that is 1350/s over a mean
  // 1.28 s, ~1720 drops, and the maps that force full rain (Icarus, Devil
  // Square, Chaos Castle) reach ~1910. Silently clamping at the cap is the
  // one failure here that looks like a bug in the rate instead.
  capacity: 3072,
  box: [v(-8, 2, -5), v(8, 4, 9)],
  direction: [TILT_30, TILT_50],
  // 20…43 u/tick plus the RainSpeed wobble (up to +40).
  //
  // Narrowed from [6, 14]. The spread is now what decides how much of the
  // budget is spent below the ground: every drop lives long enough for the
  // SLOWEST to land (see `life`), so the fastest spends the remainder of its
  // life underground and invisible. 1.57:1 keeps that waste near two thirds
  // for the fastest drop instead of five sixths, and the visible variety was
  // never coming from the speed anyway - it comes from the size.
  power: [7, 11],
  // Long enough for a drop to REACH THE GROUND, which was the whole
  // complaint: at [0.35, 0.6] a drop fell 1.3-7 tiles from a 2-4 tile spawn,
  // so the slow half of the field died in mid-air, fading out at head height
  // - and when a shower stopped, the rain did not land, it evaporated.
  //
  // The slowest drop falls at 7 x cos(50 deg) = 4.5 tiles/s, so 1.15 s puts
  // it 5.2 tiles down: past the 4-tile top of the spawn box with a tile to
  // spare, which is enough that its own fade-out (the last 15% of its life,
  // 0.8 tiles) happens entirely below the terrain. Nothing fades in view;
  // the ground hides the death, exactly as it does for DEVIAS_SNOW.
  //
  // `growth` divides this by the speed factor, so the same 5.2 tiles holds
  // at every intensity - a drizzle's drops are slower and live longer.
  life: [1.15, 1.4],
  size: [0.06, 0.08],
  // The 1×20 plane: thin across, long along the fall.
  //
  // scaleX was [0.12, 0.18], which with `size` drew a streak 0.0072–0.0144
  // tiles across. A tile is ~130 px at the game camera and the sprite's lit
  // core was a quarter of its width (ambientParticles.ts), so a drop's
  // visible part was under half a pixel: the rasteriser threw most of it
  // away and the tone curve in post finished the job, which is why the rain
  // was there with post-processing off and gone with it on. At [0.45, 0.65]
  // a drop is 0.027–0.052 tiles — 3.5–7 px, with the widened core filling
  // most of that. Still a streak, now one the frame can actually carry.
  scaleX: [0.45, 0.65],
  scaleY: [1.6, 2.4],
  stretched: true,
  // Additive, so this is how much LIGHT a drop adds: a cool grey-white,
  // strong enough to read over a lit street and not so strong that a
  // downpour whites out the screen.
  //
  // Lifted from 0.55/0.6/0.7 with the same reasoning as the width, and for
  // the same target: the Lorencia grade runs exposure 1.0 × contrast 1.2
  // with warm highlights, and ACES rolls a cool grey-white hardest of all.
  // A drop has to arrive brighter than it should look, because the grade is
  // going to take a third of it back.
  colour: [new Color4(0.82, 0.87, 0.98, 1), new Color4(0.6, 0.66, 0.78, 0.8)],
  // A drop lives well under a second: any more fade than this and the streak
  // never reaches full brightness. The shower as a whole is already ramped by
  // `RainCurrent` (rainState.ts), so the rate needs only a short slew on top.
  fade: 0.15,
  // A drop's own life is far too short to carry a shower's fade, so the slew
  // has to. `RainCurrent` ramps underneath this as well (rainState.ts), and
  // over ten times more slowly - this one is only the last corner off the
  // rate, and the length of a shower's arrival after a gate.
  ramp: 2.5,
  // What a shower LOOKS like at the ends of its ramp, as against its middle.
  //
  // Without this the only thing intensity changed was how many drops there
  // were, so a shower opening or closing was the same rain at a different
  // density - a tap, not weather. The first spits of one are small, slow and
  // far apart, and it builds into long fast streaks; here that is a drop
  // just over half the size, under half the streak length, and 62% of the
  // fall speed at the faintest emission.
  //
  // The speed also divides the life (see `growth`), so the fall distance
  // above is invariant: light rain does not stop reaching the ground, it
  // just takes 1.85 s to get there instead of 1.15.
  growth: { size: 0.55, length: 0.45, speed: 0.62 },
  skyBorne: true,
};

/**
 * Devias tavern (tiles 226…236 × 21…27.5): the same motes, a shorter
 * room, a little redder from the fireplace on the east wall.
 */
export const HEARTH_DUST: AmbientRecipe = {
  name: 'hearthDust',
  texture: 'Effect/flare01.OZJ',
  blend: 'add',
  rate: 24,
  capacity: 200,
  box: [v(-5, 0.2, -3.25), v(5, 2.4, 3.25)],
  direction: [v(-0.3, -0.1, -0.3), v(0.3, 0.25, 0.3)],
  power: [0.04, 0.12],
  life: [4, 7.5],
  size: [0.025, 0.055],
  angularSpeed: [-0.4, 0.4],
  colour: [new Color4(1, 0.72, 0.38, 0.55), new Color4(1, 0.52, 0.2, 0.35)],
  noise: v(0.25, 0.12, 0.25),
  fade: 0.35,
  // Walking through the doorway should not switch the motes on.
  ramp: 3,
};

/**
 * The two Devias fireplace houses (203…207.5 × 56…62.5 and 225…231.5 ×
 * 38…44.5). One hearth, no candelabra and about a third of the tavern's
 * floor, so the same motes over a box that fits the smaller of the two, at a
 * lower rate.
 */
export const HOUSE_HEARTH_DUST: AmbientRecipe = {
  ...HEARTH_DUST,
  name: 'houseHearthDust',
  rate: 14,
  capacity: 120,
  box: [v(-2.25, 0.2, -3.25), v(2.25, 2.3, 3.25)],
};

export const TAVERN_DUST: AmbientRecipe = {
  name: 'tavernDust',
  texture: 'Effect/flare01.OZJ',
  blend: 'add',
  rate: 36,
  capacity: 320,
  // The pub interior (tiles 120…129 × 120…136), floor to the beams.
  box: [v(-4.5, 0.2, -8), v(4.5, 2.4, 8)],
  direction: [v(-0.3, -0.15, -0.3), v(0.3, 0.2, 0.3)],
  power: [0.04, 0.12],
  life: [4, 7.5],
  size: [0.025, 0.055],
  angularSpeed: [-0.4, 0.4],
  colour: [new Color4(1, 0.78, 0.42, 0.55), new Color4(1, 0.6, 0.25, 0.35)],
  noise: v(0.25, 0.12, 0.25),
  fade: 0.35,
  ramp: 3,
};
