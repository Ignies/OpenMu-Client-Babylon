import { isHeroUnderRoof } from './roofDetection';
import { inBloodCastle } from '../../controllers/actors/locomotion';
import type { ENUM_WORLD } from '@/core/types';
import {
  createAmbientSystem,
  type AmbientRecipe,
  type AmbientSystem,
} from '../../controllers/fx/ambientParticles';
import {
  ATLANS_BUBBLES,
  ATLANS_DRIFT,
  BLOOD_CASTLE_MOTES,
  DEVIAS_SNOW,
  DEVIAS_SNOW_BIG,
  LEAF_RECIPES,
  RAIN,
  SNOWFALL_MAPS,
  UNDERWATER_MAPS,
  allDustRooms,
  ambientLeavesFor,
} from '../../controllers/weather/ambientWeather';
import { maps } from '../../controllers/maps';
import { ambientStrengthAt } from '../../controllers/weather/ambientSchedule';
import type { Room } from '../../controllers/maps';
import { serverNow } from '../../controllers/net/serverTime';
import { lookDirector } from '../../controllers/lighting/director';
import { roomMaskActive } from '../../controllers/render/scenes/roomMask';
import { roomClipAvailable, setRoomWeatherClip } from '../../controllers/weather/roomClip';
import { Vector3 } from '../../controllers/render/babylon/exports';
import { GameOptions } from '../../modules/options/gameOptions';
import { rainStrength, rainTarget } from '../../controllers/weather/rainState';
import type { ISystemFactory } from '../world';

/**
 * Ambient particles per map, weather and room (the original's `MoveLeaves`,
 * `CreateLorenciaLeaf`, `CreateDeviasSnow`). See ecs/readme.md.
 */

// Maps with a sky (rain may fall) are declared per map as `MapLayer.outdoor`
// and read through `maps.isOutdoor(map)`.

// What the air carries (`MapWeather.leaves`, read through `ambientLeavesFor`) and the dust rooms
// (`MapWeather.dust`, `allDustRooms`) are each map's own rows.

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
    ...LEAF_RECIPES.map(
      (recipe): Slot => ({
        recipe,
        followHero: true,
        active: (map, indoors) =>
          GameOptions.ambientParticles && !indoors && ambientLeavesFor(map) === recipe,
      })
    ),
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
    // Snow falls on the maps that declare a fall (`SNOWFALL_MAPS`: Devias and
    // Santa Town). A snow sky keeps rain off every Ice City world too, but
    // nothing comes down over the ice.
    {
      recipe: DEVIAS_SNOW,
      followHero: true,
      active: (map, indoors) =>
        GameOptions.ambientParticles && !indoors && SNOWFALL_MAPS.has(map),
    },
    {
      recipe: DEVIAS_SNOW_BIG,
      followHero: true,
      active: (map, indoors) =>
        GameOptions.ambientParticles && !indoors && SNOWFALL_MAPS.has(map),
    },
    // Blood Castle's embers. Not weather: they come off the burning castle,
    // not out of a sky, so a roof does not switch them off.
    {
      recipe: BLOOD_CASTLE_MOTES,
      followHero: true,
      active: map => GameOptions.ambientParticles && inBloodCastle(map),
    },
    {
      recipe: RAIN,
      followHero: true,
      // `RainCurrent` (see rainState.ts): the server's low nibble is the
      // intensity, and the value ramps rather than snapping - so the slot is
      // alive as long as any rain is still falling, including while the last
      // shower fades out after the packet has already said 'clear'.
      active: (map, indoors) =>
        GameOptions.weatherEffects &&
        !indoors &&
        maps.canRain(map) &&
        (rainTarget(map) > 0 || rainStrength() > 0),
      strength: () => rainStrength(),
    },
    ...allDustRooms().map(
      ({ world: map, room, recipe }): Slot => ({
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
      // (controllers/weather/roomClip.ts), so the shower goes on falling in the world
      // outside and is seen through the doorway. Without one - Classic tier,
      // or a roof nobody measured a volume for - there is nothing to clip
      // against and the old rule stands: under a roof, no sky weather.
      const room =
        roomMaskActive() && roomClipAvailable()
          ? (lookDirector()?.state().area?.volume ?? null)
          : null;
      const camera = scene.activeCamera?.globalPosition;
      setRoomWeatherClip(room, camera ?? ORIGIN);

      // A roof over the hero keeps the weather out (roofDetection.ts), faded or not.
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
