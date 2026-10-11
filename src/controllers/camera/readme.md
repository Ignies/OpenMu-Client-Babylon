# camera

The main-scene camera ported from the original client (CameraUtility.cpp, SceneCommon.cpp), with
per-map overrides and this client's extra zoom steps, drag and first-person mouse look.

## Public API
- `installCameraControl(camera, isActive)` (`index.ts`): installs the input listeners and saves
  the classic framing. Called once by `ecs/systems/cameraFollowSystem.ts`.
- `updateGameCamera(camera, world, pressedKeys, heroModel, dt)`: the per-frame write. Only
  `cameraFollowSystem` calls it.
- `earthQuake(deg)`: an effect's `EarthQuake`, set every tick the shake runs (Rageful Blow,
  Earthshake).
- `isFirstPerson()`, `showHeroBody()`.
- `cameraView` (MobX, `moved`) and `resetCamera()`: the `camera_reset` HUD button (`cameraKeepsView`).
- `aimX`, `aimY`, `isMouseLookActive`, `releaseMouseLook` (`mouseLook.ts`): every pick runs its
  pointer coordinates through `aimX` / `aimY` (pointer input, cursor, walk click, rest objects).
- `recipes.ts` constants: the FOV range is mirrored in `settings/gameOptions.ts` and read by the
  options window.

## How it works
- Off (`GameOptions.cameraControl` false): the classic framing saved at install is restored once
  and the camera is not touched again.
- On, in the World state, `index.ts` is the only writer of alpha, beta, radius, fov and the
  target's Y lift.
- Ctrl+wheel steps the distance ladder (`DISTANCE_BY_LEVEL`, `SetViewPortLevel`
  SceneCommon.cpp:237-253); Insert / Delete rotate the heading; pitch 48.5, vertical FOV 30 unless
  the FOV slider says otherwise. Distance eases by a third per 25 fps frame. Home belongs to the MU
  Helper, so the frame resets on warp instead (WSclient.cpp:600).
- `cameraKeepsView` (an Enhanced improvement, `versions/shared/improvements/`): a warp keeps the
  level, heading and tilt, except onto a map that pins its distance (`layers.ts`). `cameraView.moved`
  is true while the view is off the opening frame, and `resetCamera()` goes back to it.
- Ctrl + middle drag is this client's addition: left / right turns the heading, up / down pitches.
- The ladder keeps the original's five distances (1000-1400) and adds steps on both sides: below
  1000 it blends toward an eye-level shot, the innermost step is first person (the hero's body is
  hidden, `heroBody.ts`), and above it goes out to 2900. In first person the eye bobs with the
  stride unless `firstPersonBob` is off.
- `earthQuake` holds for one tick, then decays x0.2 per 25 fps frame (MainScene.cpp:197); it
  turns the view about the eye.
- A map in `layers.ts` sets the distance it opens on and / or an absolute ground height. The
  original pinned these maps and ignored the wheel; here the nearest ladder step is only the
  opening frame and the wheel keeps working. Battle Castle: 1100 and ground 255
  (CameraUtility.cpp:160-162, :255-259). PK Field and Doppelganger: 2000 (level 5,
  CDirection.cpp:72).

### Notes: mouseLook.ts
With `wsadMovement` on, first person (or any zoom with `thirdPersonMouseLook`) takes a pointer
lock so the look is unbounded. The lock freezes `clientX/clientY`, so every pick aims at the
canvas middle through `aimX` / `aimY` and the cursor parks there like a crosshair. The module only
reports mouse deltas; `index.ts` writes the angles.

### Notes: heroBody.ts
Hides the hero's meshes with `isVisible` (reversible, unlike `HiddenMesh`), so world matrices,
name plates, effect anchors and picking still work. Only meshes it hid are shown again.

## Depends on / used by
- uses: `core/eventBus`, `render/babylon`, `settings` (`GameOptions`), `fidelity` (`isOn`).
- used by: `ecs/systems` (camera follow, cursor, pointer input, player controller, rest object),
  the game cursor component, skills that shake the screen, the options window, the `camera_reset`
  HUD element.

## Change it
- a map's camera override: copy `_template.ts` to `<map>.ts`, fill `worlds`, `distance`,
  `groundHeight` (original units, 100 per tile, cite CameraUtility.cpp), add `<map>Layer` to
  `CAMERA_LAYERS` in `layers.ts`.
- a zoom step, speed or angle: `recipes.ts`. Keep the five ported distances exact.

## Tests
- `view.test.ts`: a warp keeps the turn on Enhanced and resets it on Classic and onto a pinned
  map; the reset goes back to the opening frame.
