import { isHeroUnderRoof } from './ceilingHideSystem';
import { ENUM_WORLD } from '../../common';
import {
  createAmbientSystem,
  type AmbientRecipe,
  type AmbientSystem,
} from '../../common/ambientParticles';
import {
  ATLANS_BUBBLES,
  ATLANS_DRIFT,
  DEVIAS_SNOW,
  DEVIAS_SNOW_BIG,
  HEARTH_DUST,
  HOUSE_HEARTH_DUST,
  LORENCIA_LEAVES,
  RAIN,
  SNOW_MAPS,
  TAVERN_DUST,
  UNDERWATER_MAPS,
} from '../../weather/ambientWeather';
import { maps } from '../../maps';
import { ambientStrengthAt } from '../../weather/ambientSchedule';
import {
  DEVIAS_EAST_HEARTH_HOUSE,
  DEVIAS_READING_ROOM,
  DEVIAS_TAVERN,
  DEVIAS_WEST_HEARTH_HOUSE,
  type Room,
} from '../../maps/devias/rooms';
import { serverNow } from '../../common/serverTime';
import { lookDirector } from '../../lighting/director';
import { roomMaskActive } from '../../scenes/roomMask';
import { roomClipAvailable, setRoomWeatherClip } from '../../weather/roomClip';
import { Vector3 } from '../../libs/babylon/exports';
import { GameOptions } from '../../common/gameOptions';
import { rainStrength, rainTarget } from '../../weather/rainState';
import type { ISystemFactory } from '../world';

/**
 * Ambient particles: decides each frame which of the weather /
 * leaf / dust recipes should be alive for the current map, weather and
 * area, creates or disposes them to match, and drags the hero-relative
 * ones along with the hero (the original's `MoveLeaves` spawned every
 * leaf around `Hero->Object.Position`).
 *
 *  - Lorencia / Noria: falling leaves (`CreateLorenciaLeaf`).
 *  - Atlans: marine snow drifting on the current, and bubbles rising off the
 *    seabed. The original runs Atlans through the leaf path with Lorencia's
 *    numbers (`CreateAtlanseLeaf`), but on World8's own round sprite and
 *    additive; see `ATLANS_DRIFT`.
 *  - Devias: snow (`CreateDeviasSnow`).
 *  - Rain on any outdoor map while `WeatherStatusUpdate` reports weather 1
 *    (the original only rained on event maps; the packet is OpenMU's way
 *    of switching it, so we honour it everywhere the sky is visible).
 *  - Lorencia tavern, Devias tavern and reading room: golden dust while the
 *    hero stands inside the room footprint (`ROOMS`, the same boxes the
 *    map modules register as `interactiveArea` entities).
 *
 * Sky weather is no longer switched off at a room's door. It keeps falling on
 * the world outside and is clipped per particle to what the room's openings
 * actually show (`weather/roomClip.ts`), which is the same rule the room mask
 * draws the rest of the frame by: from a tavern you watch the snow through
 * the doorway and none of it lands on the floor. Only a roof with no measured
 * volume behind it - Classic tier, an arch, a shed - still turns it off.
 *
 * Nothing here switches. A slot that stops being eligible — the hero ducks
 * under a roof, walks out of the tavern, the option goes off — only has its
 * emit rate *ramped* down to zero (`AmbientSystem.update`), and the recipe is
 * not disposed until the last particle it emitted has died. Becoming eligible
 * is the same in reverse: the system is created at rate zero and thickens up.
 * Disposing a live emitter is a pop — every leaf in the air vanishes in one
 * frame — so it is kept for the one case where the particles belong to a world
 * we are no longer standing in: a map change.
 *
 * Eligibility (map / area / option) only says a recipe *may* run. A recipe
 * carrying a `schedule` then asks the shared clock how hard it blows right
 * now (`ambientSchedule.ts`): leaves and snow come in gusts and squalls with
 * calm in between, rolled from `serverNow()` so every client on the map sees
 * the same weather at the same second. Rain is left unscheduled — the server
 * already drives it through `WeatherStatusUpdate` — and so is interior dust,
 * which is a property of the room rather than of the weather.
 */

/** Weather byte that means rain (assumed — see the weather notes). */


// Maps with a sky (rain may fall) are declared per map as `MapLayer.outdoor`
// and read through `maps.isOutdoor(map)`.

const LEAF_MAPS = new Set<ENUM_WORLD>([
  ENUM_WORLD.WD_0LORENCIA,
  ENUM_WORLD.WD_3NORIA,
]);

/** Lorencia pub floor, matching the interactive area in loadMapIntoScene. */
const LORENCIA_TAVERN: Room = {
  min: { x: 120, y: 120 },
  max: { x: 129, y: 136 },
  centre: { x: 124.5, z: 128 },
};

/** Dust rooms: the recipe runs while the hero stands inside the footprint. */
const ROOMS: { map: ENUM_WORLD; room: Room; recipe: AmbientRecipe }[] = [
  { map: ENUM_WORLD.WD_0LORENCIA, room: LORENCIA_TAVERN, recipe: TAVERN_DUST },
  { map: ENUM_WORLD.WD_2DEVIAS, room: DEVIAS_TAVERN, recipe: HEARTH_DUST },
  { map: ENUM_WORLD.WD_2DEVIAS, room: DEVIAS_READING_ROOM, recipe: TAVERN_DUST },
  {
    map: ENUM_WORLD.WD_2DEVIAS,
    room: DEVIAS_WEST_HEARTH_HOUSE,
    recipe: HOUSE_HEARTH_DUST,
  },
  {
    map: ENUM_WORLD.WD_2DEVIAS,
    room: DEVIAS_EAST_HEARTH_HOUSE,
    recipe: HOUSE_HEARTH_DUST,
  },
];

type Slot = {
  recipe: AmbientRecipe;
  /** Follows the hero each frame; otherwise the emitter is placed once. */
  followHero: boolean;
  /** `indoors`: the hero is under a roof the room clip cannot judge, so sky
   *  weather must not follow them in at all. */
  active: (world: ENUM_WORLD, indoors: boolean) => boolean;
  placeAt?: (out: Vector3) => void;
  /** Room slots: alive only while the hero stands inside this footprint. */
  room?: Room;
  /** Extra 0..1 gain on top of the recipe's schedule (rain intensity). */
  strength?: () => number;
};

/** Stand-in eye while the scene has no active camera; the clip is off then anyway. */
const ORIGIN = new Vector3();

export const AmbientParticleSystem: ISystemFactory = world => {
  const scene = world.scene;
  const areas = world.with('interactiveArea', 'worldIndex');

  const slots: Slot[] = [
    {
      recipe: LORENCIA_LEAVES,
      followHero: true,
      active: (map, indoors) =>
        GameOptions.ambientParticles && !indoors && LEAF_MAPS.has(map),
    },
    // Atlans, and any other map declaring `MapLayer.underwater`. Both run
    // whenever the map is: there is no roof to duck under down here, and the
    // drift carries its own schedule.
    {
      recipe: ATLANS_DRIFT,
      followHero: true,
      active: map => GameOptions.ambientParticles && UNDERWATER_MAPS.has(map),
    },
    {
      recipe: ATLANS_BUBBLES,
      followHero: true,
      active: map => GameOptions.ambientParticles && UNDERWATER_MAPS.has(map),
    },
    // Snow falls wherever the map says its sky is snow (`SNOW_MAPS`: Devias,
    // both Ice City worlds, Santa Town), the same set that keeps rain off.
    {
      recipe: DEVIAS_SNOW,
      followHero: true,
      active: (map, indoors) =>
        GameOptions.ambientParticles && !indoors && SNOW_MAPS.has(map),
    },
    {
      recipe: DEVIAS_SNOW_BIG,
      followHero: true,
      active: (map, indoors) =>
        GameOptions.ambientParticles && !indoors && SNOW_MAPS.has(map),
    },
    {
      recipe: RAIN,
      followHero: true,
      // `RainCurrent` (see rainState.ts): the server's low nibble is the
      // intensity, and the value ramps rather than snapping — so the slot is
      // alive as long as any rain is still falling, including while the last
      // shower fades out after the packet has already said 'clear'.
      active: (map, indoors) =>
        GameOptions.weatherEffects &&
        !indoors &&
        maps.isOutdoor(map) &&
        !SNOW_MAPS.has(map) &&
        !UNDERWATER_MAPS.has(map) &&
        (rainTarget(map) > 0 || rainStrength() > 0),
      strength: () => rainStrength(),
    },
    ...ROOMS.map(
      ({ map, room, recipe }): Slot => ({
        recipe,
        followHero: false,
        room,
        active: current => GameOptions.ambientParticles && current === map,
        placeAt: out => {
          out.set(
            room.centre.x,
            world.getTerrainHeight(room.centre.x, room.centre.z),
            room.centre.z
          );
        },
      })
    ),
  ];

  /** A live recipe, plus when its schedule last went quiet (null = emitting). */
  type Live = { ambient: AmbientSystem; quietSince: number | null };

  const live = new Map<Slot, Live>();
  const heroPos = new Vector3();
  /** Last map we ran on: a warp is the one hard cut (see the note above). */
  let lastMap: ENUM_WORLD | null = null;

  /**
   * How long a system may keep draining after it is told to stop: the ramp
   * down, plus the longest a particle emitted on the way down can still live.
   *
   * `ambient.maxLife()` rather than `recipe.life[1]`: a recipe with `growth`
   * lengthens its lifetimes as the strength falls (a slow drop takes longer
   * to reach the ground), so the recipe's own number is a floor. Reading the
   * live one is what keeps the promise that the last drops of a shower land
   * instead of being disposed in mid-air.
   */
  function drainMs(_slot: Slot, ambient: AmbientSystem): number {
    return (ambient.ramp + ambient.maxLife() + 1) * 1000;
  }

  function heroInside(room: Room, x: number, z: number): boolean {
    return (
      x >= room.min.x && x <= room.max.x && z >= room.min.y && z <= room.max.y
    );
  }

  function inTavern(): boolean {
    for (const e of areas) {
      if (e.worldIndex !== world.mapIndex) continue;
      if (e.interactiveArea.inside) return true;
    }
    return false;
  }

  return {
    update: dt => {
      const hero = world.playerEntity;
      if (!hero) return;

      const map = world.mapIndex;

      // The one hard cut: these emitters are placed in the world we just
      // left, so they cannot be allowed to drain across the warp.
      if (lastMap !== null && map !== lastMap) {
        for (const have of live.values()) have.ambient.dispose();
        live.clear();
      }
      lastMap = map;

      // The weather itself (rain ramp, settled snow, wetness) was stepped by
      // WeatherSystem just before this; the slots below only read it.
      const tavern = inTavern();

      // A room the mask is drawing keeps its own weather out, per particle
      // (weather/roomClip.ts), so the shower goes on falling in the world
      // outside and is seen through the doorway. Without one — Classic tier,
      // or a roof nobody measured a volume for — there is nothing to clip
      // against and the old rule stands: under a roof, no sky weather.
      const room =
        roomMaskActive() && roomClipAvailable()
          ? (lookDirector()?.state().area?.volume ?? null)
          : null;
      const camera = scene.activeCamera?.globalPosition;
      setRoomWeatherClip(room, camera ?? ORIGIN);

      // A ceiling hidden by CeilingHideSystem still keeps the weather out.
      const indoors = (tavern || isHeroUnderRoof()) && room === null;

      heroPos.copyFrom(hero.transform.pos as Vector3);
      const hx = heroPos.x + (hero.transform.posOffset?.x ?? 0);
      const hz = heroPos.z + (hero.transform.posOffset?.z ?? 0);

      const now = serverNow();

      for (const slot of slots) {
        const eligible =
          slot.active(map, indoors) &&
          (!slot.room || heroInside(slot.room, hx, hz));

        // Eligibility, the gust schedule and the rain intensity all feed the
        // same number, so losing the area reads exactly like the wind dying:
        // the rate ramps down and the leaves already flying land.
        const { schedule } = slot.recipe;
        const strength = !eligible
          ? 0
          : (schedule ? ambientStrengthAt(schedule, map, now) : 1) *
            (slot.strength?.() ?? 1);

        let have = live.get(slot);

        if (strength <= 0) {
          // Between episodes: ramp the rate to zero, let what is in the air
          // finish falling, then release the system until the next gust.
          if (have) {
            have.ambient.setStrength(0);
            have.ambient.update(dt);
            if (have.quietSince === null) have.quietSince = now;
            if (slot.followHero) have.ambient.emitter.copyFrom(heroPos);
            if (now - have.quietSince > drainMs(slot, have.ambient)) {
              have.ambient.dispose();
              live.delete(slot);
            }
          }
          continue;
        }

        if (!have) {
          const at = new Vector3();
          if (slot.placeAt) slot.placeAt(at);
          else at.copyFrom(heroPos);
          have = {
            ambient: createAmbientSystem(scene, slot.recipe, at),
            quietSince: null,
          };
          live.set(slot, have);
        }

        have.quietSince = null;
        have.ambient.setStrength(strength);
        have.ambient.update(dt);
        if (slot.followHero) have.ambient.emitter.copyFrom(heroPos);
      }
    },
  };
};
