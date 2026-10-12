# item_looks

One file per item (or armour set) with a look of its own beyond its model: the passes its
`RenderPartObjectBody` branch draws over or in place of the lit body (ZzzObject.cpp:6890-8920), and
the sprites `RenderLinkObject` puts on a carried weapon (ZzzCharacter.cpp:7027-8386).

```
<item>.ts   export default defineItemLook({ items: [[group, index], ...], body?: { passes, drawn? }, held? })
index.ts    finds every file (glob) and hands them to item_fx's registerItemLooks; app/boot.tsx imports it
```

## Public API
- `index.ts`: the looks, registered when the folder loads. Code reads them through item_fx
  (`itemBodyPasses(group, num)`).

## How it works
- `body.passes` are `MeshPass`es (`controllers/render/meshPasses.ts`), one per `RenderMesh` the
  branch adds: `add` (drawn again additive), `bright` (additive in place of the lit pass), `unlit`
  (flat BodyLight in place of it, a `StreamMesh` or a lone opaque chrome pass), `blend` (drawn again
  alpha blended). A pass may take its own light (from the body's), `BlendMeshLight`, UV scroll, an
  explicit `Data/` bitmap and a chrome look-up. `body.drawn` lists the meshes the branch draws lit.
- What decides the kind, in `BMD::RenderMesh` (ZzzBMD.cpp:1298): a chrome flag first (the chrome
  bitmap, or the explicit one, on the normal look-up; additive with RENDER_BRIGHT, else opaque); then
  the blend mesh (`m->Texture == blendMesh`, or -2): additive at `BodyLight x BlendMeshLight`, the
  call's alpha ignored; then RENDER_TEXTURE, additive with RENDER_BRIGHT. Its UVs scroll only for the
  blend mesh or the `StreamMesh`.
- `held` are the sprites `RenderLinkObject` issues every frame for the weapon while a character
  carries it, in the hand or on the back (ZzzCharacter.cpp:7027-8386): a sheet, the weapon model's bone
  and a point in its frame (cm), a scale, a light (off the wearer's, `o->Light`, when it reads it) and a
  rotation, each a number or a function of WorldTime (`rand()` per frame stays `Math.random()`;
  `rand_fps_check(n)` is `oneIn(n, scale)`). `when` gates a sprite on the wearer (`o->CurrentAction`,
  `c->SafeZone`): it is drawn at size 0 while the test fails.
  `wing` are the same on the phoenix wing the item carries (the Phoenix Soul Star's, MonkSystem.cpp:245).
  `emit` are what it creates there that outlives the frame (CreateParticle, CreateJoint: the running
  sparks, the Sword Breaker's drops, the Frost Mace's frost): run each drawn frame at a bone's world point
  with the wearer (action, safe zone, facing, map) and the frame's length; each rolls its own `rand_fps_check(n)`
  as `Math.random() * n < dt * 25`.
  `ecs/systems/weaponSpriteSystem.ts` draws them (`actors/weaponSprites.ts`).
- The passes and sprites are the original's, drawn while the Item effects option draws the original passes
  (Legacy, Both); Off and Improved draw the plain model, as before.
- Worn (`ecs/systems/appearanceSystem.ts`), on the ground and in the bag (`actors/itemModel.ts`
  `dressItemModel`); a bag icon's spin moves them, its still picture is drawn at time 0.

## Change it
- an item's look: edit its file. A new one: a new file.

## Tests
- `item_looks.test.ts`: every look's passes as numbers, read at one WorldTime (NullEngine draws no pixels).
- How a pass is drawn: `controllers/render/meshPasses.test.ts`; who takes it: `actors/itemModel.test.ts`,
  `ecs/systems/appearanceSystem.test.ts`.
