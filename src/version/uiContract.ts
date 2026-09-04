/**
 * THE UI CONTRACT for a game version - what `versions/<id>/ui/` exports.
 *
 * Types only, so `versions/registry.ts` can name them without importing app
 * code (`import type` is erased). The module itself is the one door a version
 * has that *may* import app code, because it is only ever loaded from inside
 * the running app (`loadVersionUi`, React.lazy at a consumer, or an ECS
 * system after boot) - never from the boot path.
 *
 * The rule base code follows: it never asks which version this is. It asks
 * this module for the screen, or `gameVersion.features.*` for whether a
 * screen exists at all.
 */
import type { ComponentType } from 'react';
import type { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';

/**
 * The scene behind the pre-game screens (start menu, server list, login,
 * character select). Two kinds, because they are genuinely different things:
 *
 * - `world`: warp to a login world and run its camera-walk script. Season 6
 *   (worlds 73 / 74) and anything else whose tree ships a login map.
 * - `scene`: build a set piece directly in the scene, no terrain and no
 *   warp. What 0.97d does - its login screen is a ship on an empty sea,
 *   assembled from five models around the world origin, and its tree has no
 *   login world to warp to.
 */
export type PregameBackdrop =
  | {
      readonly kind: 'world';
      readonly login: ENUM_WORLD;
      readonly characters: ENUM_WORLD;
    }
  | {
      readonly kind: 'scene';
      create(world: World): PregameScene;
    };

/** Which pre-game screen the backdrop is standing behind. */
export type PregamePhase = 'login' | 'characters';

/**
 * A standalone pre-game set piece. Owns its own models and its own camera;
 * `dispose` runs when the pre-game screens are left. `update` is called once
 * a frame with the seconds since the last one, and is the only writer of the
 * camera while it lives.
 */
export interface PregameScene {
  update(deltaTime: number, phase: PregamePhase): void;
  dispose(): void;
}

/**
 * The MU wordmark over the start menu. `Data/`-rooted paths (`muSprite`'s
 * prefix). At least one of the two layers must be given: Season 6 ships a
 * TGA mark over a JPEG glow, the 0.97d tree only the JPEG.
 */
export type PregameLogo = {
  /** Sprite with alpha, drawn on top. */
  readonly mark?: string;
  /** JPEG under it, or alone: keyed by luminance so its black is transparent. */
  readonly glow?: string;
  readonly width: number;
  readonly height: number;
};

/** The pre-game half of a version's UI: the backdrop and the two screens on it. */
export type PregameUi = {
  readonly backdrop: PregameBackdrop;
  readonly logo: PregameLogo;
  readonly LoginPage: ComponentType;
  readonly CharactersPage: ComponentType;
};

/**
 * The sprite sheets to decode up front. `preloadSprites.ts` keeps owning
 * *when* and *how*; which files exist is the version's own answer, because a
 * period `Data/Interface/` and the Season 6 one share almost no names.
 */
export type VersionPreload = {
  /** Decoded before the start menu paints. */
  readonly pregameSprites: readonly string[];
  /** Decoded on world entry, dropped on logout. */
  readonly worldSprites: readonly string[];
};

/**
 * What `versions/<id>/ui/index.tsx` exports. Every name exists in every
 * version: a version without a window exports a component that renders
 * nothing (`versions/_template/ui`), so no consumer branches on a version id.
 */
export type VersionUi = {
  readonly pregame: PregameUi;
  readonly preload: VersionPreload;
  /** In-game windows, one export per window. */
  readonly MasterSkillsWindow: ComponentType;
};
