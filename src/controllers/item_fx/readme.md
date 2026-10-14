# item_fx

How items look on a model: the shared item materials (Classic Standard and Enhanced PBR), the
original client's item passes, the item glow tiers and the weapon swing trails.

## Public API
- `index.ts` (the door, small on purpose): `legacyItemEffectsOn`, `improvedItemEffectsOn` for the pets controller.
- `itemEffectMode.ts`: `ItemEffectMode` (Off, Legacy, Both, Improved), `itemEffectMode()`,
  `legacyItemEffectsOn()`, `improvedItemEffectsOn()`, `legacyRenderLevel()`, `capItemLevel(level)`,
  `itemEffectSignature()`, `ITEM_EFFECT_MODE_LABEL_KEYS` / `_MAX` (the options slider).
- `itemDrawLevel.ts`: `itemDrawLevel(group, num, level, ground)`, the level an item is drawn at.
- `itemLooks.ts`: `defineItemLook`, `registerItemLooks` (content's `versions/shared/item_looks/`,
  at boot), `itemBodyPasses(group, num)` (the `MeshPassSet` a model takes, shown while
  `legacyItemEffectsOn()`), `itemHeldSprites(group, num)` (the sprites a carried weapon draws), `itemHeldEmitters`,
  `itemHeldSet` (its sprites and emitters), `itemWingSet` / `itemWingSprites` (on its phoenix wing),
  `fixedLight`, `CHROME01`, `heldLuminosity(ms)` (the frame's `Luminosity` roll), `luminous`, `frameRolls`,
  `randomTurn`, `oneIn`, types `ItemLook`, `MeshPass`, `HeldEmitter`, `HeldSet`, `HeldWearer`,
  `HeldSprite`, `LookLight`.
- `itemVisualTier.ts`: `itemVisualTier(item, ground)` (cached descriptor), `strongestTierOf(items)` /
  `strongestTier(items)`, `setItemGlowClock` / `itemGlowClock`, `itemEmissiveAt`, `itemHaloAt`,
  `itemLightColorAt`, type `ItemVisualTier`.
- `itemMaterial.ts`: `createItemMaterial(scene, bright, flatLit, withScroll)`,
  `createItemPbrMaterial(scene)`, `useMeshAlphaTestTexture(material)`, `packBodyLight` /
  `packBodyLightFor`, `syncPbrDetail()`, `livePbrMaterials()`, type `UvScroll`. The scroll variants
  also read `metadata.uvMap`: a chrome look-up by the normal (RENDER_CHROME, CHROME2, CHROME4 to CHROME7, METAL,
  ZzzBMD.cpp:1600-1640) in place of the mesh UVs, for an item look's passes.
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
- `itemDrawLevel.ts`: `RenderPartObjectEffect` first swaps the level by model, then caps it
  (ZzzObject.cpp:9419-9563): jewels (compressed too), Tear of Elf, Soul Shard, the Heart and the plain
  ring +8; the transformation rings and Christmas Star +13; orbs and crystals +9; wings, capes,
  harmony, refine stones and the gemstone +0; Devil Square tickets halved up to +6, +13 above;
  arrows and bolts `2L + 1`. On the ground (`ground`, the drops in `ecs/systems/itemGlowSystem.ts`)
  the models `CreateItem` swaps in by level take their own case (ZzzObject.cpp:6014-6136): Box of
  Luck, Rena, Ring of Honor, Dark Stone, Wizards Ring, Ale, Loch's Feather. Both looks read the drawn
  level, so the improved ladder follows it too.
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
- Flat-lit variants (a bag icon, `render/iconShot.ts`): the excellent redraw is vertex lit in the
  original, and a bag item's vertex light is its BodyLight (`LightEnable` off), so `lit` is BodyLight
  there instead of the scene's lambert sum. The texel itself is drawn at BodyLight too (`FLAT_LIT_OVERRIDE`):
  `RenderMesh` colours an unlit mesh by it (ZzzBMD.cpp:1740-1745); before, the flat pass ignored it.
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
  to 1.6x), which put a yellow sheen on wood and stone. How much becomes metal is the Metal and
  Painted plate sliders (`pbrLooks.ts`), on gear only.
- `createItemPbrMaterial`: albedo sampled as-is (no gamma decode), Babylon's legacy range falloff,
  no environment texture; specular comes from the key lights and the torch pool.
- `pbrLooks.ts`: the surface looks, per mesh by `metadata.surface` (`render/surfaceClass.ts`) as
  `muSurface` (metal, sheen, skin, rim), all scaled by the detail slider:
  - gear: the derived steel/gold candidate (Metal) or painted plate (Painted plate, any texel that is
    not a dark gap) becomes metal of its own colour at Metal roughness, so red plate reads as dark
    red steel. Metal loses its diffuse, so it needs something to reflect: an analytic environment,
    the sky light's top colour above the horizon and a dim share of its ground colour below (both
    times its intensity), looked up by the reflected view and weighted by Babylon's
    `specularEnvironmentReflectance` (F0 is `albedo x metal`, the dielectric F0 is 0). From the
    game's top-down camera most of an armour reflects the ground, so it darkens and only the curves
    that face the sky glint. A full-strength sky, or the painted white highlights as steel at a
    lower plate share, read as a grey wash over the set. The eight knobs are Options sliders under
    Materials > Detail (`materialMetal` ... `materialSky`, 0-10, mapped by `lookValues`), bound as
    `muLooksA` / `muLooksB` uniforms each frame, so a slider moves the look with no recompile. It
    follows day and night and rooms with the rig, with no texture and no `REFLECTION` define; the
    sun's highlight is the direct GGX one.
  - cloth: a grazing sheen, `diffuseBase x albedo x (1 - NdotV)^4`, so it only lights the lit side.
  - skin: a warm scatter in the band a wrapped sun reaches and plain lambert does not, shadowed.
  - characters (`characterAsset`): a thin rim of the sky colour, `(1 - NdotV)^6`, on the side away
    from the sun (a full rim lit the whole figure from the top-down camera).
- `BURLEY_PI_GLSL`: Babylon's PBR direct diffuse is Burley, which divides by pi; the Standard
  lambert does not. The pi is put back inside the PBR fragment (a macro over `computeDiffuseLighting`,
  defined after Babylon's function, so only `lightFragment`'s call sites see it), not on the lights,
  so the sun and the torch pool keep one level for both paths and the two can share a scene
  (Materials "Characters"). The hemispheric sky is a `mix` on both paths and takes no gain; the GGX
  specular never carried the 1/pi, so `specularIntensity` is the plain detail strength.

## Depends on / used by
- uses: `render` (Babylon exports, `pbrMaps`, `materialQuality`, `renderingStyle`,
  `frameSnapshot`), `lighting` (light model, tiers, key rig, clouds, tint, point light pool),
  `weather/snowCaps`, `assets/mu/sprites`, `actors` (hand bones, weapon class), `fx` (types),
  `settings`, `version`.
- used by: `assets/modelLoader.ts` (materials), `render/propBatches.ts` (`packBodyLight`),
  `render/scenes` (sceneLook, materialDebug), `actors`, `fx/itemAura.ts`, `fx/itemCrackle.ts`,
  `lighting/items.ts`, the appearance, item glow, skill cast and weapon trail ECS systems,
  `controllers/pets`, the options window.

## Change it
- change a legacy colour: the tables in `itemLegacyEffects.ts`.
- change the improved ladder: `itemVisualTier.ts` (levels, gains, rates).
- change which swings trail: `weaponBlurFor` in `weaponBlur.ts`.
- a new item look: put it behind a new `ItemEffectMode` or a new shader define in
  `itemMaterial.ts`; never change the legacy passes to add one.

## Tests
- `pbrLooks.test.ts`: `muSurface` per surface class; the looks GLSL carries no comments; the slider
  defaults map onto the tuned look and roughness keeps a floor.
- `itemDrawLevel.test.ts`: the drawn level of the jewels, rings, wings, orbs, tickets, arrows and the
  ground's swapped models, every other item at its own, then the cap.
- `itemMaterial.test.ts`: the excellent redraw takes the lit body's vertex light, and BodyLight alone
  on a flat-lit material (a bag item, `LightEnable` off, ZzzInventory.cpp:9682); the scroll materials' METAL and
  CHROME2 look-ups.
