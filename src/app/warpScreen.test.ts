import { describe, expect, it } from 'vitest';
import { UIState } from '../controllers/interface/uiState';
import { warpShowsScreen } from './warpScreen';

// ReceiveTeleport loads a world only when the map changes (WSclient.cpp:2201-2204).
describe('warpShowsScreen', () => {
  it('shows no loading screen for a warp within the map already up', () => {
    expect(warpShowsScreen(0, UIState.World, true, 0)).toBe(false);
  });

  it('shows it for another map, before the terrain is up, and outside the world', () => {
    expect(warpShowsScreen(2, UIState.World, true, 0)).toBe(true);
    expect(warpShowsScreen(0, UIState.World, false, 0)).toBe(true);
    expect(warpShowsScreen(0, UIState.Characters, true, 0)).toBe(true);
  });
});
