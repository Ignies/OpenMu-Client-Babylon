# Performance

The client must hold its frame rate on modest hardware. Treat every per-frame path as hot.

- **No allocation per frame.** Reuse vectors and arrays (module-level scratch like
  `const tmp = new Vector3()`), use `*ToRef` / `*InPlace` Babylon calls.
- **No callback or literal made per frame either.** `forEach` / `filter` / `map` with an arrow, an
  inline `sort` comparator, a builder called inside a row (`perTick(k)(t)`) and an options object
  handed over (`{ base, sunDirection }`) each allocate every call: loop by index, compact in place,
  hoist the comparator or the built function, rewrite one kept object.
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
