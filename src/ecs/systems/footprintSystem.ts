import { ENUM_WORLD } from '../../common/types';
import { GameOptions } from '../../common/gameOptions';
import {
  FADE_STEPS,
  FULL_STEPS,
  addFootprint,
  bootStrength,
  resetFootprints,
  updateFootprints,
  type PrintKind,
  type PrintLane,
} from '../../weather/footprints';
import { trackFor, type TrackRecipe } from '../../weather/recipes';
import { monsterModelTypeOf } from '../../common/playSpeed';
import { weather } from '../../weather';
import { isTileOpen } from '../../libs/mu/terrainMask';
import { onSnowGround } from '../../weather/snowSink';
import { SNOW_MAPS } from '../../weather/ambientWeather';
import { RUN_THRESHOLD } from '../../common/locomotion';
import { ploughSnowTrail } from '../../weather/snowTrail';
import type { Entity, ISystemFactory } from '../world';

/**
 * Lays the tracks down (`footprints.ts`) and runs the drying boot.
 *
 * Two different things wear the same shapes:
 *
 *  - **Wet prints.** The water is on the *boot*, not on the ground, so these
 *    keep appearing after the walker has left the puddle and — the whole point
 *    — keep appearing **indoors**. Walking wet feet into the tavern and leaving
 *    a trail across the floorboards is the behaviour worth having.
 *  - **Snow prints.** The snow is on the *ground*, so these need settled cover
 *    under the foot and stop dead at a doorway. A run of them is the trail.
 *
 * ### Everything that walks, not just the hero
 *
 * This was hero-only by design, and the design was a budget: a pool of 64
 * prints is about sixteen tiles of trail, and one busy square would have
 * emptied it into a mess of overlapping stamps. Three things pay for the
 * change.
 *
 *  - The hero has a **ring of their own** (`PrintLane`), at exactly the size
 *    they had. Nothing anyone else does can evict the trail leading away from
 *    where you are standing.
 *  - Only walkers **near the hero** are laid at all (`PRINT_RANGE`), and only
 *    so many of them at once (`MAX_WALKERS`). A print half a screen away is a
 *    few pixels; a print off the screen is nothing at all.
 *  - The long trail is not decals anyway. It is the ploughed channel in
 *    `snowTrail.ts`, a world-space depth map that the terrain shader folds
 *    into the snow's own relief — that has no pool to empty and is what
 *    actually reads from a distance.
 *
 * ### Different feet leave different marks
 *
 * What a thing presses into the snow is its own (`weather/recipes.ts`): a
 * humanoid leaves boot prints, a hound leaves four pads in two pairs, a spider
 * leaves a line of pricks with clean snow between them, a worm leaves one
 * unbroken groove and no prints at all, and anything off the ground — a Budge
 * Dragon hovering, a wraith, a Dinorant rider — leaves the snow exactly as it
 * found it. The recipe decides the silhouette, the size, the stride, the
 * stance, whether there are two feet or four, how hard it presses and how wide
 * a channel its body ploughs; this file decides *when*, and does it once for
 * everyone.
 */

// ---- what a walker is ------------------------------------------------------

/**
 * Tiles from the hero past which nothing lays a print.
 *
 * Comfortably past the far edge of the screen at the game's camera, so a trail
 * is never seen to start. Everything beyond it costs nothing at all — the
 * distance test is the first thing the loop does.
 */
const PRINT_RANGE = 26;

/**
 * Most walkers laid in one frame, hero excluded.
 *
 * The cap exists for the crowd ring rather than for the CPU: sixteen walkers
 * at two prints a footfall drain 128 slots in a few seconds of a Devias square
 * at its busiest, and past that the marks stop being anybody's trail and start
 * being churn. Everything in range over the cap is simply skipped this frame;
 * it is not a queue, because a trail that fills in one stride out of three is
 * worse than one that is not there.
 */
const MAX_WALKERS = 16;

/**
 * A print is only laid where the *foot* is, so a walker whose feet are off the
 * ground leaves nothing however its recipe reads. `HoverHeight` is the render
 * lift the original applies to a Budge Dragon's bob (`MonsterObject`) and to a
 * Dinorant rider (`animationSystem`), and it is exactly the signal wanted: a
 * flyer is a flyer for as long as it is actually up.
 *
 * The recipe's own `none` covers the ones that never come down, which the lift
 * cannot see because their models simply walk their animation in the air.
 */
const HOVERING = 0.05;

/**
 * The two gaits, and the two reference looks they produce (`improved_2.jpg`
 * for the walk, `improved.jpg` for the run).
 *
 * **Walking** through dense snow the boot never clears the surface: each step
 * ploughs on from the last, and what is left is one continuous trench with
 * broken, shouldered walls, the individual prints only readable as deeper
 * pockets inside it. So the walk lays a wide, strong drag under the whole
 * track and keeps a short stride so the pockets run together.
 *
 * **Running** the leg lifts clear between footfalls: the stride is longer,
 * each print is a separate deep punch with untouched snow between, there is
 * no trough at all, and the push-off throws far more snow. Keyed on the
 * original's `c->Run` accumulator (`playerAnimation.run`), which is what
 * swaps the run clips in, so the prints change gait when the animation does.
 *
 * These are **multipliers on the recipe**, not absolute numbers, and that is
 * what lets one gait table serve a hero, a yeti and a spider. Against the
 * `boot` recipe they reproduce the tuned hero exactly: stride 0.5 and 0.78,
 * press 0.28 and 0.4, and so on down. Only players have a `run` accumulator,
 * so everything else walks — which is right anyway, since a charging hound
 * lays prints by the tile and not by the second.
 */
const GAIT = {
  walk: {
    stride: 1,
    /** Print size. */
    scale: 1,
    /** Print strength inside the trench. */
    press: 1,
    /** Trench width. */
    dragWidth: 1,
    /** How strongly the trench applies. */
    drag: 1,
    /** Spray at each footfall. */
    spray: 1,
  },
  run: {
    /** A running stride is about half again a walking one (0.5 → 0.78). */
    stride: 1.56,
    /** The boot comes down harder and goes in further. */
    scale: 1.05,
    /**
     * Still a pocket in a channel, not a separate hole (0.28 → 0.4). The
     * earlier cut gave the run no trough at all and full-strength prints, and
     * because MU's hero runs by default that was the trail everybody actually
     * saw: a row of dark ovals (the "before" shot). Deep snow does not care
     * whether the leg lifted between footfalls — the body still ploughs a
     * channel.
     */
    press: 1.4286,
    dragWidth: 0.9,
    drag: 0.9,
    spray: 1.2,
  },
} as const;

type Gait = keyof typeof GAIT;

/**
 * Everything remembered about one walker between frames.
 *
 * Held in a `WeakMap` keyed by the entity, so a monster that dies, despawns or
 * goes out of scope takes its state with it and there is nothing to prune.
 */
type Walker = {
  /** Where it was last frame, so the distance walked can be banked. */
  lastX: number;
  lastZ: number;
  /** Distance banked since the last footfall. */
  travelled: number;
  /** Which foot is next: +1 or -1. */
  side: number;
  /** Where its CENTRE was at the last footfall, so a trench can run from it. */
  prevCX: number;
  prevCZ: number;
  havePrev: boolean;
  /**
   * Prints since the boots were last in water. Starts past the end of the fade
   * so someone who has not stepped in anything leaves nothing.
   */
  stepsSinceWet: number;
};

function newWalker(x: number, z: number): Walker {
  return {
    lastX: x,
    lastZ: z,
    travelled: 0,
    side: 1,
    prevCX: 0,
    prevCZ: 0,
    havePrev: false,
    stepsSinceWet: FULL_STEPS + FADE_STEPS + 1,
  };
}

// ---- tuning ----------------------------------------------------------------

/**
 * Tiles walked between footfalls, and how far apart the two feet are, both now
 * per creature in `weather/recipes.ts`. The reasoning that set the hero's is
 * kept here, because it is about the *system* and not about boots.
 *
 * `stride` is ALSO how far the newest print can be behind the walker, and that
 * is the number that matters most for how the trail reads. A print is laid the
 * instant the accumulator crosses it and not again until the next one, so when
 * someone stops walking the last print is, on average, half a stride back —
 * and at the moment they stop, up to a full one. That lag is what keeps
 * reading as "the prints are too far from the boots"; it is not an offset that
 * can be corrected, because at the moment of placement the print IS under the
 * foot. The only lever is to place them more often.
 *
 * It is ALSO, and this is the binding constraint, what makes the trail read as
 * a walk. Feet alternate, so consecutive prints must be separated along the
 * track by MORE than a print is long. At 0.34 against a print 0.573 long they
 * overlapped by 0.23 and the trail read as rows of PAIRS rather than as left,
 * right, left — which is not a matter of taste, it is the gait being wrong.
 * Shortening the PRINT is what buys room for both, which is why
 * `FOOTPRINT_TUNING.length` came down at the same time.
 *
 * `side` is the distance from the WALKER'S CENTRE to the print, so it has to
 * match where that creature's feet actually are — and a person's stance is
 * narrow. At 0.24 the two tracks were 0.48 tiles apart, roughly a third of the
 * figure's own height, so the near print landed visibly outside the near boot
 * and the trail straddled the character instead of running under them.
 */

/** Settled cover needed before a foot leaves a mark in it. */
const SNOW_MIN = 0.12;

/**
 * How snowy a tile has to be before it takes a print at all.
 *
 * Above `SNOW_COVER.bedDefault` (0.3), the share `snowUnderfoot` gives a
 * non-snow tile, so paving and paths take none — they get the thin overlay
 * wash and nothing stamped into them — and below the 0.55 the part-snow
 * tiles (cobbles with snow between) get, so those take a faint mark. The
 * bilinear sampling means the threshold is crossed part way across the
 * boundary tile rather than exactly on its edge.
 */
const SNOW_TILE_MIN = 0.45;

/**
 * Print size against how deep the snow is.
 *
 * A boot on a dusting scuffs a small mark off the top; the same boot in deep
 * snow sinks in and leaves a wide crater. Because the quad scales uniformly
 * and the relief march works in UV, this makes the print deeper as well as
 * bigger, which is the whole point of it.
 */
const SNOW_SCALE_MIN = 0.75;
const SNOW_SCALE_MAX = 1.35;

/** A jump in position larger than this is a warp, not a stride. */
const TELEPORT = 4;

/** How far either side of the foot the ground slope is sampled, in tiles. */
const SLOPE_SPAN = 0.35;

/**
 * Settled cover from which a foot stops clearing the snow between steps and
 * starts ploughing through it, joining the prints into a trail.
 *
 * Above a scuff, well below a blizzard: in thin cover the foot lifts clean and
 * the prints genuinely are separate, which is what the earlier build was
 * drawing for every depth.
 */
const DRAG_MIN_COVER = 0.4;

/** Longest gap worth joining, in tiles. Beyond this it was a bound, not a step. */
const DRAG_MAX_GAP = 1.1;

export const FootprintSystem: ISystemFactory = world => {
  /**
   * Everything that has feet and a place to put them: every player (the hero
   * included, via `playerAnimation`) and every monster and NPC (`npcType`).
   * Two queries rather than one because the ECS has no "or", and because the
   * two differ in exactly one thing — a player has a run accumulator.
   */
  const players = world.with('transform', 'playerAnimation');
  const characters = world.with('transform', 'npcType');

  let lastMap: ENUM_WORLD | null = null;
  let have = false;

  /** Per-walker state; replaced wholesale on a map change. */
  let walkers = new WeakMap<Entity, Walker>();

  function step(
    map: ENUM_WORLD,
    walker: Walker,
    track: TrackRecipe,
    lane: PrintLane,
    x: number,
    y: number,
    z: number,
    angle: number,
    gait: Gait
  ) {
    const G = GAIT[gait];
    const cover = weather.snowCover;

    let kind: PrintKind | null = null;
    let strength = 0;
    let scale = 1;

    if (SNOW_MAPS.has(map)) {
      // Snow lies on the ground, so the ground has to be open, covered, and
      // actually snow — and it has to be the ground, not a bridge over it.
      // `isTileOpen` alone only says there is sky overhead; it is true of a
      // paved square as readily as of a drift, which is how prints ended up
      // stamped into Devias' swept stone.
      const lying = isTileOpen(x, z) ? weather.snowUnderfoot(world, x, z) : 0;

      if (
        cover > SNOW_MIN &&
        lying > SNOW_TILE_MIN &&
        onSnowGround(world, x, y, z)
      ) {
        kind = 'snow';
        // Barely-covered ground takes a faint mark; deep cover takes a clear
        // one. Saturates well before full cover so a trail is not reserved
        // for blizzards. Scaled by how much snow is down here as well as by
        // how much has fallen, so the trail thins out as it crosses a path
        // rather than stopping at a tile edge.
        strength = Math.min(1, (cover - SNOW_MIN) / 0.35) * lying;
        scale = SNOW_SCALE_MIN + (SNOW_SCALE_MAX - SNOW_SCALE_MIN) * cover;
      }
    } else {
      // Water is on the boot. Standing in it recharges; every print spends it.
      //
      // Asked of the PATCH under the foot, not of the map. The first cut
      // read `inPuddles()` - "has the ground pooled anywhere" - so once the
      // streets were wet the boot recharged on every outdoor step and never
      // dried. Water is where the shader draws it (weather/puddleUnderfoot).
      // A half-drawn edge charges the sole part way: a boot that clipped the
      // rim of a puddle is damp, not soaked.
      const open = isTileOpen(x, z);
      const water = open ? weather.puddleUnderfoot(world, x, z) : 0;

      if (open && water >= 0.5) {
        walker.stepsSinceWet = 0;
      } else if (open && water > 0.15) {
        walker.stepsSinceWet = Math.min(
          walker.stepsSinceWet,
          FULL_STEPS + Math.round(FADE_STEPS * (1 - water))
        );
      } else {
        walker.stepsSinceWet++;
      }

      strength = bootStrength(walker.stepsSinceWet);
      if (strength > 0) kind = 'wet';
    }

    if (!kind || strength <= 0) return;

    // Perpendicular to the heading, so the feet straddle the walk line.
    const px = Math.cos(angle) * track.side * walker.side;
    const pz = -Math.sin(angle) * track.side * walker.side;
    walker.side = -walker.side;

    // A quadruped puts a hind foot down and a fore foot ahead of it on the
    // same side. Two prints in a pair, and the pair alternating sides, is
    // what makes a four-legged track read as four-legged.
    //
    // None at all for a slitherer: a worm's footfall is only a place along
    // the groove for the channel below to run from.
    const feet = track.shape === 'none' ? 0 : track.feet === 4 ? 2 : 1;
    const alongX = Math.sin(angle) * track.reach;
    const alongZ = Math.cos(angle) * track.reach;

    let sprayed = false;

    for (let foot = 0; foot < feet; foot++) {
      const fx = x + px + alongX * foot;
      const fz = z + pz + alongZ * foot;

      // The snow surface. THE PRINT GOES HERE AND NOWHERE ELSE.
      //
      // An earlier cut dropped the quad by `snowSinkDepth` to line it up with
      // the sunken boot, and that broke it outright: the print is a decal on
      // an opaque, depth-writing terrain, held just `Z_LIFT` (0.012 tiles)
      // above it. A drop of 0.2 tiles is seventeen times that lift, so the
      // quad went *under* the ground and failed the depth test everywhere the
      // sink was non-zero. It still drew on bridges - the one place
      // snowSinkDepth answers zero - which is exactly backwards from what it
      // should do, and is what gave the bug away.
      //
      // The alignment it was reaching for is already right without moving
      // anything. The rim of a hole in snow IS at the surface; the boot is
      // *inside* the hole. The wearer sits at -sink (0.204) and the hollow's
      // floor is at -depth (0.34), so the foot is in the hole with room under
      // it, which is what it should look like. If the two ever do read apart,
      // the safe dial is `FOOTPRINT_TUNING.sink` - moving the character cannot
      // break a depth test, and moving the decal can.
      const fy = world.getTerrainHeight(fx, fz);

      // -9999 until the map's height data lands; a print at that depth would
      // be a quad a mile under the world.
      if (fy <= -9000) continue;

      // The ground's own normal under the foot, from four height samples. A
      // decal held flat on sloping ground has to hover to clear its high side,
      // which is what made the prints look stuck on rather than pressed in.
      const hx0 = world.getTerrainHeight(fx - SLOPE_SPAN, fz);
      const hx1 = world.getTerrainHeight(fx + SLOPE_SPAN, fz);
      const hz0 = world.getTerrainHeight(fx, fz - SLOPE_SPAN);
      const hz1 = world.getTerrainHeight(fx, fz + SLOPE_SPAN);

      // A sample that fell off the map or onto a NoGround tile (-10000) would
      // tip the print on its side; flat is the safe answer.
      const usable = hx0 > -9000 && hx1 > -9000 && hz0 > -9000 && hz1 > -9000;

      const up = usable
        ? {
            x: -(hx1 - hx0) / (2 * SLOPE_SPAN),
            y: 1,
            z: -(hz1 - hz0) / (2 * SLOPE_SPAN),
          }
        : { x: 0, y: 1, z: 0 };

      addFootprint(world.scene, {
        x: fx,
        y: fy,
        z: fz,
        angle,
        kind,
        shape: track.shape,
        strength:
          kind === 'snow' ? strength * track.press * G.press : strength,
        scale: scale * (kind === 'snow' ? track.scale * G.scale : 1),
        up,
        lane,
      });

      // The snow the print displaced has to go somewhere. Fired from the same
      // stride so the puff and the hole it came from always agree.
      //
      // The hero's only, and the reason is `snowSpray`'s single shared
      // emitter: every burst in a frame comes out wherever the last caller
      // put it, so a yeti across the square would throw its snow at the
      // hero's feet. It is "a detail around the feet, not a feature you see
      // from across the square" (snowSpray.ts) and is not worth a second
      // particle system; a per-burst emitter is what it would take.
      if (kind === 'snow' && lane === 'hero' && !sprayed) {
        sprayed = true;
        weather.snowSpray(
          world.scene,
          fx,
          fy,
          fz,
          Math.min(1, strength * track.spray * G.spray)
        );
      }
    }

    // Join it to the last footfall. Deep snow does not let a leg swing through
    // cleanly, so the gap between footfalls is a ploughed trough — and that
    // trough is what makes a row of holes read as somebody's trail. It runs
    // from CENTRE to CENTRE, not from foot to foot: joined foot to foot it
    // zigzags with the alternating feet and reads as a sawtooth of rectangles
    // instead of the one channel the legs actually plough.
    const dragWidth = track.dragWidth * G.dragWidth;

    if (
      kind === 'snow' &&
      dragWidth > 0 &&
      track.drag > 0 &&
      cover >= DRAG_MIN_COVER &&
      walker.havePrev
    ) {
      const gap = Math.hypot(x - walker.prevCX, z - walker.prevCZ);

      if (gap <= DRAG_MAX_GAP) {
        // Into the trail depth map, not a decal: the channel is one
        // continuous shape in the snow's own relief (weather/snowTrail.ts).
        // Scaled by how far past the threshold the cover is, so the trail
        // fades in with the snow rather than switching on.
        ploughSnowTrail(
          walker.prevCX,
          walker.prevCZ,
          x,
          z,
          dragWidth,
          strength *
            track.drag *
            G.drag *
            Math.min(1, (cover - DRAG_MIN_COVER) / 0.3)
        );
      }
    }

    walker.prevCX = x;
    walker.prevCZ = z;
    walker.havePrev = true;
  }

  /**
   * Bank one entity's movement and lay a footfall when it has walked far
   * enough. Returns whether it counted against `MAX_WALKERS` — a walker that
   * did not move, or that leaves nothing, is free.
   */
  function walk(map: ENUM_WORLD, entity: Entity, lane: PrintLane): boolean {
    const { transform, modelObject } = entity;
    if (!transform) return false;

    const track = trackFor(entity.npcType);

    /** Nothing to press and nothing to plough: a flyer, a wraith. */
    const marks = track.shape !== 'none' || track.dragWidth > 0;

    const x = transform.pos.x + (transform.posOffset?.x ?? 0);
    const z = transform.pos.z + (transform.posOffset?.z ?? 0);

    const walker = walkers.get(entity);

    if (!walker) {
      if (marks) walkers.set(entity, newWalker(x, z));
      return false;
    }

    const dx = x - walker.lastX;
    const dz = z - walker.lastZ;
    const moved = Math.sqrt(dx * dx + dz * dz);

    walker.lastX = x;
    walker.lastZ = z;

    // Off the ground: a hovering Budge Dragon, a Dinorant rider. The position
    // is still banked — the trail is picked up where they land, and not with a
    // trench dragged across everywhere they flew.
    //
    // A gate, a knock-back or a respawn is the same case for the same reason:
    // it is not a stride.
    if (moved > TELEPORT || (modelObject?.HoverHeight ?? 0) > HOVERING) {
      walker.travelled = 0;
      walker.havePrev = false;
      return false;
    }

    if (moved <= 0 || !marks) return false;

    walker.travelled += moved;

    const gait: Gait =
      entity.playerAnimation && entity.playerAnimation.run >= RUN_THRESHOLD
        ? 'run'
        : 'walk';

    const stride = track.stride * GAIT[gait].stride;

    if (walker.travelled < stride) return true;

    walker.travelled -= stride;
    step(
      map,
      walker,
      track,
      lane,
      x,
      transform.pos.y,
      z,
      Math.atan2(dx, dz),
      gait
    );

    return true;
  }

  /**
   * Why each character in scope is or is not marking the ground, from the
   * browser console:
   *
   *     muTracks()
   *
   * A wrong row in `weather/recipes.ts` fails **silently** — a creature
   * classified `none` or `slide` simply leaves nothing, which is
   * indistinguishable from the whole feature being broken, and Devias' Worm
   * cost an afternoon of guessing at a screenshot before that was obvious.
   * Every gate this system applies is reported here against the model type
   * the recipe was keyed by, so the next one is a lookup.
   */
  function explain() {
    const hero = world.playerEntity;
    const rows: Record<string, unknown>[] = [];

    for (const group of [players, characters]) {
      for (const entity of group) {
        const { transform, modelObject } = entity;
        const x = transform.pos.x + (transform.posOffset?.x ?? 0);
        const z = transform.pos.z + (transform.posOffset?.z ?? 0);
        const track = trackFor(entity.npcType);

        const range = hero
          ? Math.hypot(x - hero.transform.pos.x, z - hero.transform.pos.z)
          : Infinity;

        rows.push({
          name: entity.objectNameInWorld ?? (entity === hero ? '<hero>' : ''),
          npcType: entity.npcType ?? '<player>',
          model: monsterModelTypeOf(entity.npcType),
          shape: track.shape,
          press: track.press,
          drag: track.dragWidth,
          tiles: +range.toFixed(1),
          why:
            entity.dying
              ? 'dying'
              : track.shape === 'none' && track.dragWidth <= 0
                ? 'recipe leaves nothing'
                : (modelObject?.HoverHeight ?? 0) > HOVERING
                  ? 'off the ground'
                  : entity !== hero && range > PRINT_RANGE
                    ? 'out of range'
                    : !onSnowGround(world, x, transform.pos.y, z)
                      ? 'on a structure'
                      : !isTileOpen(x, z)
                        ? 'under a roof'
                        : weather.snowCover <= SNOW_MIN
                          ? `snow cover ${weather.snowCover.toFixed(2)}`
                          : weather.snowUnderfoot(world, x, z) <= SNOW_TILE_MIN
                            ? 'tile is not snow'
                            : 'marking',
        });
      }
    }

    return rows;
  }

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).muTracks = explain;
  }

  return {
    update: dt => {
      const map = world.mapIndex;

      if (map !== lastMap) {
        lastMap = map;
        have = false;
        walkers = new WeakMap();
        resetFootprints();
      }

      // Ground weather is its own option: prints, spray and the terrain
      // layers go together, and none of them is the sky.
      if (!GameOptions.weatherEffects || !GameOptions.advancedEffects) {
        if (have) resetFootprints();
        have = false;
        return;
      }

      have = true;

      const hero = world.playerEntity;

      if (hero) walk(map, hero, 'hero');

      // Everyone else, nearest first in the only sense that is free: the
      // hero's own position is the centre and the range test is a squared
      // distance, so a monster on the far side of the map costs two
      // subtractions and a compare.
      const hx = hero?.transform.pos.x ?? 0;
      const hz = hero?.transform.pos.z ?? 0;
      let laid = 0;

      if (hero) {
        for (const group of [players, characters]) {
          for (const entity of group) {
            if (laid >= MAX_WALKERS) break;
            if (entity === hero) continue;

            // A corpse fading into the ground is not walking.
            if (entity.dying) continue;

            const ex = entity.transform.pos.x - hx;
            const ez = entity.transform.pos.z - hz;
            if (ex * ex + ez * ez > PRINT_RANGE * PRINT_RANGE) continue;

            if (walk(map, entity, 'crowd')) laid++;
          }
        }
      }

      updateFootprints(dt);
    },
  };
};
