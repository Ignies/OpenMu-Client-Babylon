import type { ENUM_WORLD } from '../../core/types';
import { maps, type PerWorld } from '../maps';
import type { Sounds } from './recipes';
import type { AmbientTimed, MapAmbientBed, MapAmbientOneShot } from './ambientBeds';
import type { MapTown } from './music';
import type { MapObjectLoop } from './objectLoops';
import type { VoiceSet } from './mapMonsters';
import type { StepRule } from './footsteps';

/**
 * A map's own sound, `MapLayer.sound`, written in the map's folder
 * (`versions/shared/maps/<map>/sound.ts`). Each field is read by one entry
 * at run time through `maps.rowFor`; a field left out means "nothing here".
 */
export type MapSound = {
  /** Loops under the map (`ambientBeds.ts`). */
  readonly beds?: PerWorld<readonly MapAmbientBed[]>;
  /** `rand_fps_check` one-shots over the bed (`ambientBeds.ts`). */
  readonly oneShots?: PerWorld<readonly MapAmbientOneShot[]>;
  /** One-shots on a clock (`ambientBeds.ts`). */
  readonly timed?: PerWorld<readonly AmbientTimed[]>;
  /**
   * The map's track (`music.ts`). `null` is a world checked and found to
   * have no `ManageBackgroundMusic` case; omitted is silent too.
   */
  readonly music?: PerWorld<Sounds | null>;
  /** A town's tracks, picked by where the hero stands (`music.ts`). */
  readonly town?: PerWorld<MapTown>;
  /** Object types that sound where they stand (`objectLoops.ts`). */
  readonly objectLoops?: PerWorld<readonly MapObjectLoop[]>;
  /** The map's own monster voices, by model type (`mapMonsters.ts`). */
  readonly monsterCues?: PerWorld<VoiceSet>;
  /** Voices from a map hook with no world guard: heard on every map. */
  readonly monsterCuesAnyMap?: VoiceSet;
  /** The hero's footsteps by tile (`footsteps.ts`); omitted plays soil. */
  readonly footsteps?: PerWorld<readonly StepRule[]>;
  /** Every death on the map plays one of these instead of its own (`combatSfxSystem`). */
  readonly deathBurst?: PerWorld<readonly Sounds[]>;
};

/** The map's death burst (`MapSound.deathBurst`), or undefined for each body's own death sound. */
export function mapDeathBurst(world: ENUM_WORLD): readonly Sounds[] | undefined {
  return maps.rowFor(world, l => l.sound?.deathBurst);
}
