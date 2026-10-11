import type { PerWorld } from '../maps';
import type { MapArea, MapLook } from './profiles';
import type { MapObjectLights } from './mapObjectLights';

/**
 * A map's own lighting, `MapLayer.lighting`, written in the map's folder.
 * Each field is read by one entry at run time through the `maps` controller;
 * a field left out means the controller's default.
 */
export type MapLighting = {
  /** The map's look over the open or enclosed default (`profiles.ts`). */
  readonly look?: PerWorld<MapLook>;
  /** The room looks its `create` registers, by name (`profiles.ts`). */
  readonly areas?: Readonly<Record<string, MapArea>>;
  /** Lights its objects throw, by object type (`mapObjectLights.ts`). */
  readonly objectLights?: PerWorld<MapObjectLights>;
  /** The sky throws thunder flashes here (`sky.ts`). */
  readonly thunder?: boolean;
};
