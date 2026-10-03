import type { Room } from '../maps';

/**
 * A map's own weather, `MapLayer.weather`, written in the map's folder. Each
 * field is read by one effect at run time through the `maps` controller. The
 * sky kind itself (`outdoor`, `rain`, `snow`, `snowfall`, `underwater`,
 * `desert`) stays on the entry, where the renderer and the sound read it too.
 */
export type MapWeather = {
  /**
   * Rains at full strength whatever the packet says: `MoveLeaves` overwrites
   * `RainTarget` every frame (ZzzEffectFireLeave.cpp:422-436). Read by `rainState.ts`.
   */
  readonly alwaysRain?: boolean;
  /** The ground darkens and pools in the rain. Read by `wetness.ts`. */
  readonly wetGround?: boolean;
  /** What the wind carries through the air (`MoveLeaves`). Read through `ambientLeavesFor`. */
  readonly leaves?: 'leaves' | 'petals';
  /** Dust that hangs in a room while the hero stands in it. Read through `ambientDustFor`. */
  readonly dust?: readonly MapDustRoom[];
};

/** One dust room: the footprint and which dust (`TAVERN_DUST`, `HEARTH_DUST`, `HOUSE_HEARTH_DUST`). */
export type MapDustRoom = {
  readonly room: Room;
  readonly dust: 'tavern' | 'hearth' | 'houseHearth';
};
