# loading

The loading screen and the gates that decide when it may lift. `classic/` is the original
loading screen; a new look is a sibling implementation (`loading/<name>/`), never an edit of
`classic/` (see [docs/controllers.md](../../../docs/controllers.md)).

## Public API
- `Loading` (`index.ts`, `loadingState.ts`): observable `sceneLoading`, `loadingProgress`,
  `spritesLoading`, `isLoading` and their setters. The terrain sets the scene flag and progress,
  boot clears `spritesLoading` once the screen art is in.
- `WarpFade`, `warpFades` (`fade/index.tsx`, ours, the `warpFade` improvement): a warp to another
  map from inside the world sets `Loading.inWorldWarp` (boot); boot reads a still of the map being
  left off the canvas on the next frame (`Loading.warpSnapshot`, a JPEG data URL; the terrain loader
  waits that frame), which covers the load and dissolves into the new map in 400 ms once
  `sceneLoading` clears (which also clears `inWorldWarp`). `App.tsx` hides `LoadingScreen` for it.
- `LoadingScreen` (`classic/index.tsx`): the React overlay shown while `Loading.isLoading`;
  `hidden` (read in render) is the app saying a page with its own progress is up (the preloader).
- `setSceneHold(name, held)`, `sceneHeld()` (`sceneGate.ts`): named holds that keep the screen up
  for content staged after the map lands.
- `isStaged(entity)` (`sceneGate.ts`): true when an entity's model, its body and equipment parts
  and its appearance pass are done (or the model failed to load).
- `pregameLoad` (`pregameLoad.ts`): MobX state for the pre-game load: `characters` (0..1, how far
  the character screen scenery is cached) and `worldsOpen` (the worlds card is open).

## How it works
- `sceneReadySystem` gates the screen on the map: terrain in and every visible object staged
  (`isStaged`). Content a system spawns later (the character select line-up, a warp scope)
  holds the gate by name with `setSceneHold` until it arrives; `sceneHeld` is read only by
  `sceneReadySystem`.
- `classic/index.tsx` draws the art twice (a blurred `cover` copy behind a `contain` copy) and
  the progress bar from `Loading.loadingProgress`. It shows nothing while `hidden()` is true.
- `classic/art.tsx`: the original load art, `LSBg01..04.OZJ`, laid out as four tiles of the
  800x600 sheet (two tall top tiles, two short bottom tiles); `useSheetSizes` sizes it to the
  window.
- `classic/progressBar.tsx`: four layers in order: a blurred glow, the `Progress_Back.OZJ`
  trough, the `Progress.OZJ` fill clipped to the ratio with `screen` blending (drops the black
  of the art), then a shimmer. The fill moves by transforms (a window slid in from the left, its
  art slid back), which keep animating while a map load holds the main thread.
- `creep.ts` (`useBarMotion`, `barMotion`, `creepTarget`; the `loadBarCreep` improvement): each report sends the bar toward a point past it (a fifth of the way to `CREEP_CAP`) over 10 s, as a compositor transition, so it never stands still; done fills in 0.25 s. Used by `classic/progressBar.tsx` and the preloader's runner. Classic shows the report.
- `pregameLoad` is written by `loginSceneSystem` (characters) and the preloader page
  (worldsOpen); `sound/loginMusic.ts` starts the menu music once `worldsOpen` is set.

## Depends on / used by
- uses: `interface/components/mu_sprite`, `ecs/world` (types).
- used by: `app/App.tsx` (`LoadingScreen`); `sceneReadySystem`, `characterSelectSystem`,
  `modules/warp/warpScopeHold.ts` (scene gate); `loginSceneSystem`,
  `versions/shared/ui/pages/preloader`, `sound/loginMusic.ts` (`pregameLoad`).

## Change it
- new loading screen look: add `loading/<name>/index.tsx` exporting a component, and mount it in
  place of `LoadingScreen` in `src/app/App.tsx` (behind an option or a version).
- hold the screen for new late content: call `setSceneHold('<name>', true)` when it starts and
  `setSceneHold('<name>', false)` when it is in.
- change what counts as a loaded entity: `isStaged` in `sceneGate.ts`.

## Tests
- `classic/progressBar.test.tsx`: the bar moves by transform, not width, and clamps its input.
- `fade/index.test.tsx`: which warps fade (none on Classic), and the still covers only while the scene loads.
- `creep.test.ts`: the creeping bar only moves forward, stops short of the cap, and is off on Classic.
