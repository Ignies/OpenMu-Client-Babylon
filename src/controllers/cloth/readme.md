# cloth

The original's physics cloth (`CPhysicsCloth`, Engine/Physics/PhysicsManager.cpp): a grid hung by its top
row from a bone, swinging in the wind, drawn as two textured faces with a Classic shadow. Generic: it
knows how a cloth moves and draws, never who wears which one (the wearers' content names the specs).

## Public API
- `ClothSpec`: one cloth, `CPhysicsCloth::Create`'s arguments (bone, offset, grid, size, front and back
  `Data/` bitmaps, `PCT_*` flags) plus its `SetWindMinMax` and `AddCollisionSphere` calls. The `PCT_*`
  flags are the original's (PhysicsManager.h:115-150).
- `ClothSet(scene, body)`: one wearer's cloths (`o->m_pCloth`) on a `ClothBody` (a model object's node and
  rig), the original's array: `build(slot, spec)` (`Create`), `destroy(slot)`, `has(slot)`, `count`
  (`m_byNumCloth`), `built` (`m_pCloth`), `drop()` (`DeleteCloth`); each frame the wearer's rule `draw`s the
  slots its loop reaches after `undraw()`, and `setLight` gives the `CloakLight`. `shown`, `held` (stun or
  sleep: `Move2(0, 5)`) and `castsShadow` are set every frame by the wearer's system; `size`, `cloth(s)`,
  `mesh(s)`, `drawn(s)` read it.
- `cloth`: the facade (`Controller`); its `update(map, dt)` advances the 25 Hz clock.
- `runClothFrame()`: the frame's ticks and draws; the scene calls it before its first camera renders.
- `PhysicsCloth`: the simulator alone (tests, readers).

## How it works
- Everything is simulated in MU world centimetres, z up: the set turns the rig's bone matrices into
  that (scene `(x, y, z)` is MU `(x, z, y)` in tiles) as the `ClothAnchor` the simulator reads.
- `Create` (:325-482) lays the grid 20 behind the body in its turn (`AngleMatrix(o->Angle)` with the
  bone's translation), links each vertex down, across and diagonally (the up diagonals only from the
  third row, as the original), and pins the top row through the same matrix. The first step moves the
  pins onto the bone (`SetFixedVertices`, bone frame `(z, -y, x)`), so the links into the top row start
  stretched, as in the original.
- A 25 Hz tick is the original's frame: `CPhysicsManager::Move` steps the shared wind (a random walk in
  -0.2..1), then each cloth runs `Move2(0.005, 5)`: forces (the gust around a seed vertex that moves every
  400 ms, damping, gravity 2.45 or 4.41 heavy), the stretched springs, the pins, an Euler step, then
  `PreventFromStretching` (the spheres, the loose links averaged, the strict vertical links one by one).
  A link past 20 times its length tears the cloth: the set drops them all and the wearer's rule builds anew.
- The clock is stepped by the world's systems (`cloth.update`) and spent in
  `scene.onBeforeCameraRenderObservable` (once a frame): there the render id has moved on, so the
  bones read this frame's clips. A hidden set neither steps nor draws (the original only moves a
  rendered character's cloth), so a cloth seen again after a long walk tears and is rebuilt.
- Drawing (`RenderFace`, :832-886): one mesh holds both faces when they share a bitmap, else one mesh
  per face. The vertex buffer is rewritten in place after a tick, in world tiles; between ticks the mesh
  carries it by the anchor bone's move since that tick (`inverse(bone at tick) x bone now`). The faces
  are unlit, texel times `CloakLight`: `PCT_MASK_BLIT` opaque and culled (each side its own bitmap),
  `PCT_MASK_ALPHA` keyed at 0.25 and blended, both sides drawn, `PCT_MASK_BLEND` and `PCT_MASK_LIGHT`
  added (ONE, ONE) with no depth write. A `PCT_MASK_LIGHT` cloth's faces pulse in their own light
  (`sin(WorldTime * 0.001) * 0.1 + 0.4`, :810-816) and each vertex carries a `BITMAP_LIGHT` sprite (`flare01`,
  `HeldSprites`) whose scale and light come from the original loop's outer index (:784-804, `lightSprite`).
- The Classic shadow is `RenderBodyShadow` with the cloth (ZzzBMD.cpp:2642-2710): every quad on the
  ground, untextured, folded from the wearer. It lays every built cloth below `count`, drawn or not: a
  cloth the loop skips is neither stepped nor drawn, and its shadow stays where it was built or last
  stepped, which never moves (a Dark Lord with a weapon and no cape); the `drawnClothShadows` improvement
  (Enhanced, Ultra) leaves those out, read once a frame in `runClothFrame`. A clone of the front mesh shares its
  buffers under the blob material, made the first time the set casts one. The keyed and opaque cloths are cascade
  casters on the graded tiers.

## Depends on / used by
- uses: `render` (the Babylon exports, the blob shadow material), `assets` (`getDataTexture`), `fx`
  (`HeldSprites`), `fidelity` (`isOn`).
- used by: `actors` (`PlayerObject.Cloth`, `MonsterObject.Cloth`), `ecs/systems/clothSystem.ts` (the clock
  and the wearers).

## Change it
- a new wearer or cloth: a spec in its content; nothing here changes.
- a new `PCT_*` behaviour: `physicsCloth.ts` (simulation) or `clothMesh.ts` (drawing), with its
  PhysicsManager.cpp lines.

## Tests
- `physicsCloth.test.ts`: the grid, pins and links `Create` makes, the shoulder and curve shapes, the
  gust gains, gravity, settling, the shared and rubber2 winds, following the bone, tearing, the held
  step and the spheres.
- `clothSet.test.ts`: the faces (indices, UVs, materials per draw mode, the tint, the in-place buffer), the
  `PCT_MASK_LIGHT` pulse and lights, the wind direction from the body's turn, the pins on a rig's bone, the carry between ticks, cloths kept,
  destroyed and torn, an undrawn cloth lying where it was built with its shadow, nothing past `count`, a stale
  cloth tearing when stepped again far off, a hidden wearer, the shadow clone, and the cost of 20 caped players (logged).

## Notes
- Not ported: `CPhysicsManager`'s own cloth list, which nothing fills, and `CPhysicsClothMesh`
  (PhysicsManager.cpp:948-1209), a cloth made of a model's own mesh. Its users:
  - the Magic Skeletons 1-7 (monsters 89-143): mesh 2 of the body, pinned to bone 18, `PCT_HEAVY`, two
    spheres (ZzzCharacter.cpp:8502-8539);
  - the Divine Pants: mesh 3 of the part, pinned to bone 2, `PCT_OPT_CORRECTEDFORCE | PCT_HEAVY`, five
    spheres (ZzzObject.cpp:10637-10646);
  - the Grand Soul and Dark Soul Pants (`PCT_OPT_MESHPROG`): a 5x8 / 7x5 grid on bone 17 whose layout
    overwrites mesh 2 of the part, triangles and UVs (:10610-10680; ZzzOpenData.cpp:304-308 runs it once at load).
- What it needs: the GLB submesh's vertices with their bone (`Node`, from `JOINTS_0`); the pinned ones
  (`Node == bone`) skinned on the CPU each tick; links from the triangles (each edge, loose when the ends are
  over 10 apart in x, plus the far corner of the next triangle, `FindMatchVertex` / `FindInLink`); a
  `PhysicsCloth` that takes those vertices and links instead of its grid (its `PCT_OPT_CORRECTEDFORCE` step is
  already here) and the mesh's force seed (`InitForces`); a plain copy of the submesh drawn with the part's
  own material (light, level, excellent pass) from the cloth's positions while the skinned one is hidden; for
  `MESHPROG`, that copy rebuilt as the grid. The pants' cloth belongs to the body part (`p->m_pCloth`, torn by
  `DeleteCloth(NULL, o, p)` when the part changes), so the part loader must own a set per part.
