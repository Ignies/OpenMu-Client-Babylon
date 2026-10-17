import { UIState } from '../controllers/interface/uiState';

/**
 * Whether a warp to `map` covers the scene with the loading screen. `ReceiveTeleport` loads a world
 * only when the map changes (WSclient.cpp:2201-2204), so a warp within the map up in the world shows none.
 */
export function warpShowsScreen(map: number, ui: UIState, terrainUp: boolean, current: number): boolean {
  return !(ui === UIState.World && terrainUp && map === current);
}
