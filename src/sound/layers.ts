import type { SoundLayer } from './layer';
import { listenerLayer } from './listener';
import { ambientBedsLayer } from './ambientBeds';
import { crackleLayer } from './crackle';
import { objectLoopsLayer } from './objectLoops';
import { musicLayer } from './music';
import { footstepsLayer } from './footsteps';
import { uiLayer } from './ui';
import { combatLayer } from './combat';
import { monstersLayer } from './monsters';

/**
 * THE list. Every sound entry in the game is one line here, and adding an
 * entry is adding one line. Nothing else in the codebase enumerates them.
 *
 * Order is update order: the listener refreshes the hero position first,
 * everything positioned reads it after.
 */
export const SOUND_LAYERS: readonly SoundLayer[] = [
  listenerLayer, // hero position + `playSfx`; everything below reads it
  ambientBedsLayer, // reads the listener tile and weather
  crackleLayer, // reads the listener hero and the lighting layer's flames
  objectLoopsLayer, // reads the listener hero / world and the map-object entities
  musicLayer, // reads the listener world (terrain ready)
  footstepsLayer, // reads the listener hero's clip
  uiLayer, // command-only
  combatLayer, // command-only
  monstersLayer, // command-only
];
