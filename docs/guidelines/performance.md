# Performance

The client must hold its frame rate on modest hardware. Treat every per-frame path as hot.

- **No allocation per frame.** Reuse vectors and arrays (module-level scratch like
  `const tmp = new Vector3()`), use `*ToRef` / `*InPlace` Babylon calls.
- **No scene walks per frame.** Keep lists of what you need; never search the scene graph in
  `update`.
- **No material recompiles at runtime.** Changing defines or light counts recompiles shaders;
  decide them at load.
- **No new render pass** without a measured reason and an option to turn it off.
- **Pool effects.** The fx layers pool their meshes; spawn through `effects.spawn`.
- **Load lazily.** Code a player may never reach (version UI, big windows) is a dynamic import.
- **Measure.** The perf readout (Shift+Ctrl+Alt+P) shows frame time and draw calls; compare before
  and after on the same map and camera.
- **Less code is faster to read and usually faster to run.** Prefer the shorter version.
