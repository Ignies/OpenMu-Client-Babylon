# item_fx

How items look on a model: the shared item materials (Classic Standard and Enhanced PBR), the
original client's item passes, the item glow tiers and the weapon swing trails.

## Public API
- `itemEffectMode.ts`: `ItemEffectMode` (Off, Legacy, Both, Improved), `itemEffectMode()`,
  `legacyItemEffectsOn()`, `improvedItemEffectsOn()`, `legacyRenderLevel()`, `capItemLevel(level)`,
  `itemEffectSignature()`, `ITEM_EFFECT_MODE_LABEL_KEYS` / `_MAX` (the options slider).
- `itemVisualTier.ts`: `itemVisualTier(item)` (cached descriptor), `strongestTierOf(items)` /
  `strongestTier(items)`, `setItemGlowClock` / `itemGlowClock`, `itemEmissiveAt`, `itemHaloAt`,
  `itemLightColorAt`, type `ItemVisualTier`.
- `itemMaterial.ts`: `createItemMaterial(scene, bright, flatLit, withScroll)`,
  `createItemPbrMaterial(scene)`, `useMeshAlphaTestTexture(material)`, `packBodyLight` /
  `packBodyLightFor`, `syncPbrDetail()`, `livePbrMaterials()`, type `UvScroll`.
- `weaponBlur.ts`: `weaponBlurFor(hands, action, hasLevel)` (type `WeaponBlurRow`), the warrior
  glint (`warriorGlint`, `warriorGlintStar`, `WARRIOR_GLINT_BONE` / `_TIP`); which skills take it is
  each skill's `warriorGlint` field, read through the skills controller's `hasWarriorGlint`.

## How it works
- Item effects option (Options > Video): Off, Legacy (the original passes only), Both, Improved
  (the modern layer only). `effectLevel` is the original "+Effect limitation"
  (`GetRenderLevel()`, 0..4): it caps the drawn level at `2n + 5` and at 0 drops the excellent /
  ancient passes (ZzzObject.cpp:9555, :10307). Both looks obey it.
- `itemVisualTier` turns level (capped), excellent, ancient and sockets into one descriptor read
  by the body, the hand and the ground drop alike. Ancient and socket looks need the version's
  `features.ancientItems` / `socketItems`. Legacy tinting starts at +3 (ZzzObject.cpp:10213).
- `itemLegacyEffects.ts`: colour tables from ZzzObject.cpp `PartObjectColor` (chrome),
  `PartObjectColor2` (+11..+15 Chrome02) and `PartObjectColor3` (ancient).
- `itemMaterial.ts`: one shared, frozen material per variant; textures, BodyLight and item state
  are bound per mesh from `mesh.metadata`. The legacy passes (`RenderPartObjectEffect`,
  ZzzBMD.cpp `RenderMesh`) are folded into one fragment: each pass is an additive redraw with a
  chrome texture looked up by the world normal. Lit variants compile per lighting state:
  `MU_LINEAR_LIGHT`, `MU_WRAP`, `MU_TOON*`; Classic compiles none and stays `texel x BodyLight x
  light`. BodyLight is capped at 1.0 per channel on Classic (ZzzBMD.cpp:255-257); graded tiers
  divide by the peak so a torch's hue survives.
- `weaponBlur.ts`: `CreateWeaponBlur` (ZzzCharacter.cpp:3766-4042) as a table: which swing clips
  with which weapon leave a trail, the hilt and tip samples down the link bone (`BlurType`), the
  sheet (`BlurMapping`) and colour. `ecs/systems/weaponTrailSystem.ts` asks once per clip start
  and spawns `effects.spawn('blur', ...)` (`fx/blur.ts`). `RenderBlurs`
  (ZzzEffectBlurSpark.cpp:173) draws a levelled owner's trail subtractive, a level-0 one additive.

### Notes
- Improved ladder (`itemVisualTier.ts`), all in the item's legacy chrome colour: +0-6 none, +7-8
  sheen, +9-10 pulse, motes, arcs, ring and a light, +11-12 denser with sparks, +13-15 a real
  light source. Excellent adds a cyan-green shimmer, ancient a green pulse.
- `syncPbrDetail`: one dial moves every way Enhanced comes out paler than Classic: specular
  intensity (the Standard material has none), metallic, bump level, and the added emissive
  (`DETAIL_UNIFORM`). Roughness is left alone; scaling it would make surfaces shinier.
- Half-lambert (`MU_WRAP`): the original shades `dot*0.8 + 0.4`, clamped >= 0.2. It is added to
  the light sum as `sun x (wrap(dot) - max(dot, 0)) x shadow`, constants divided by 1.2 so a
  sun-facing face is unchanged. The sun's shadow factor is recovered from Babylon's aggregate as
  `agg x n - (n - 1)` (the sun is the only light with a generator).
- Toon (`MU_TOON`): the lit sum is remapped onto `muToon.x` bands between the sky floor
  (`muToonRef.y`) and the key (`muToonRef.x`); light above the key passes through. A stepped rim
  goes on figures. `MU_TOON_ULTRA` adds a stepped sun highlight on figures and hatching over the
  darkest band.
- Blend meshes: drawn additive at `BodyLight * BlendMeshLight` (ZzzBMD.cpp:1580-1596). The
  multiply is on the scrolling variant only (water, waterfalls, sand-falls, Dungeon curtains);
  without it Elbeland's stacked waterfalls summed to white. The plain bright card keeps the texel,
  since a character part's BodyLight would make elf wings vanish.
- UV scroll (`BlendMeshTexCoordU/V`, `EnableWave` ZzzBMD.cpp:2146): the shared material's
  placeholder makes Babylon compile `DIFFUSEDIRECTUV = 1`, so there is no texture matrix to write.
  The offset is its own uniform and the texel is re-fetched at `CUSTOM_FRAGMENT_UPDATE_DIFFUSE`,
  under `#ifdef DIFFUSE`. It cannot move to the vertex stage: `vDiffuseUV` is fragment-only and
  the program fails to link. Cost: the alpha test sees the unscrolled texel (Noria curtains 42/43,
  Lost Tower conduits 3/4).
- `useMeshAlphaTestTexture`: Babylon's off-screen passes alpha-test through
  `getAlphaTestTexture()`, which on a shared material is an opaque placeholder. Babylon always
  calls `needAlphaTestingForMesh(mesh)` right before it, so the mesh is caught there and its own
  texture handed back.
- Metalness: there is no diffuse-loss compensation. The old one also raised the metallic F0 (up
  to 1.6x), which put a yellow sheen on wood and stone. `METAL_MAX` in `render/pbrMaps.ts` is the
  one knob.
- `createItemPbrMaterial`: albedo sampled as-is (no gamma decode), Babylon's legacy range falloff,
  no environment map; specular comes from the key lights and the torch pool.

## Depends on / used by
- uses: `render` (Babylon exports, `pbrMaps`, `materialQuality`, `renderingStyle`,
  `frameSnapshot`), `lighting` (light model, tiers, key rig, clouds, tint, point light pool),
  `weather/snowCaps`, `assets/mu/sprites`, `actors` (hand bones, weapon class), `fx` (types),
  `settings`, `version`.
- used by: `assets/modelLoader.ts` (materials), `render/propBatches.ts` (`packBodyLight`),
  `render/scenes` (sceneLook, materialDebug), `actors`, `fx/itemAura.ts`, `fx/itemCrackle.ts`,
  `lighting/items.ts`, the appearance, item glow, skill cast and weapon trail ECS systems,
  `modules/pets`, the options window.

## Change it
- change a legacy colour: the tables in `itemLegacyEffects.ts`.
- change the improved ladder: `itemVisualTier.ts` (levels, gains, rates).
- change which swings trail: `weaponBlurFor` in `weaponBlur.ts`.
- a new item look: put it behind a new `ItemEffectMode` or a new shader define in
  `itemMaterial.ts`; never change the legacy passes to add one.

## Tests
None in this folder.
