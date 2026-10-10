# lighting

Everything that throws light onto the map (torches, items, characters, skills, server effects,
the Icarus thunder) and the per-map look around it: key lights, sky, clouds, haze and shadow
policy. It knows how to light something, never which skill or item asks for it.

## Public API
- For map object classes (`index.ts`): `lightMapObject`, `LOGIN_CHANDELIER`, `LOGIN_WALL_TORCH`,
  `createEffectLight`, `EffectLight`.
- `lighting` (`index.ts`): the facade. `update(map, dt)`, `reset()`, `register(layer)`,
  `layersFor(map)`; readers `emitters(map)`, `liveCount`, `characterIsLit(e)`, `look()`;
  commands `omen(name)`, `skillTargeted`, `skillArea`, `skillAt`, `skillTrail`, `skillCue`,
  `skillBody`, `skillFollow`, `skillSpot`, `skillLand`, `skillStrike`, `skillHold`, `arrow`,
  `objectEffect`, `lightCharacter`, `snuffCharacter`, and `flash(scene, recipe, anchor)` for an
  ad-hoc light.
- `lightSource.ts`: `LightSource.attach`, `LightRecipe`, `LightAnchor`, `PRIORITY_*`.
- `recipes.ts`: the colour presets (`flame`, `ember`, `arc`, `frost`, `venom`, `tide`, `shade`,
  `holy`, `spark`) and `effectLight(colour, extent, seconds)` for the graded tiers.
- `skills.ts`: `SkillLight` (the type of a skill's `light` field), `SKILL_LIGHTS` (filled by
  `registerSkills`), `ARROW_LIGHTS`, `EFFECT_LUMINOSITY`, `CAST_HEIGHT`.
- `mapLighting.ts`: `MapLighting`, the type of a map's `lighting` field (`look`, `areas`,
  `objectLights`, `thunder`). The row types are exported from `index.ts` for the map folders.
- `mapObjectLights.ts`: `LightEmitter` (map specs build their light tables from it; `bone` marks an
  offset that stands for a bone and grows with the object, ZzzBMD.cpp:168-180; `terrain.pulse`
  breathes the ground light where the original writes a `sinf(WorldTime * k)` and no roll),
  `MapObjectLights`, `lightMapObject`, `lightEmittersFor`. `mapObjectLightAdapter.ts`: `MapObjectLights`, the
  `ModelObject` host. `lightCarrier.ts`: `LightCarrier`, a light without a drawn body.
- `effectLights.ts`: `createEffectLight`, `createMovableFlare` (flare cards; they light nothing),
  `FlareSpec` (a card as a light table names it), `FlareTexture`: the sheet a card is drawn from, by
  the bitmap the original names: `'light'` (BITMAP_LIGHT, flare01.jpg, a soft white glow,
  ZzzOpenData.cpp:5207) unless a spec names another (`'flare'` BITMAP_FLARE, Flare.jpg, a warm star,
  :5309; `'spark1'` BITMAP_SPARK + 1, Spark03.jpg, :5216; `'shiny1'` BITMAP_SHINY + 1,
  Shiny02.jpg, 32 by 64, :5275; `'shiny5'` BITMAP_SHINY + 5, shiny05.jpg, :5325; `'impact'`
  BITMAP_IMPACT, Impack03.jpg, :5267; `'magic1'` BITMAP_MAGIC + 1, Magic_Ground2.jpg, :5209;
  `'lightning1'` BITMAP_LIGHTNING + 1, lightning2.jpg, :5295; `'kanturu2ndEffect1'`
  BITMAP_KANTURU_2ND_EFFECT1, Object39's k_effect_01.jpg, :5495). A card is its sheet's own width
  by its height times its scale (zzzeffectsprite.cpp:72-77), times the object's scale unless
  the spec is `unscaled`; `pulse` waves its brightness (`abs` folds the wave up at zero, the
  original's `absf(sinf(...))`), `grow` its size, `spin` turns it from the world's clock (the
  original's `WorldTime`, shared by every card) in whole degrees, smoothly with `smoothSpin`
  (Aida's torch, GMAida.cpp:310), and `randomAngle` turns it to a
  fresh `rand() % 360` degrees every frame, and a `MovableFlare` takes
  `setLuminosity`, `setScale` and `setAngle` (degrees, the original's `Rotation`) from its host.
  One sprite manager per sheet and scene.
- `items.ts`: `lightItem`, `itemSelfLight`. `sky.ts`: `strikeThunder`.
- `lightingQuality.ts`: the tiers (`lightingTier()`, `tierIndex()`: Classic, Enhanced, Ultra),
  `pointLightBudget`, MSAA and CSM state.
- `pointLightPool.ts`: `initPointLightPool`, `updatePointLightPool`, `registerPointLightEmitter`.
- Look: `director.ts` (`createLookDirector`, `lookDirector`; the live director is held in
  `activeDirector.ts`, so the sky dome and horizon read it without importing the director), `profiles.ts` (`profileFor`,
  `areaProfile`, `MapLook`, `MapArea`, the open and enclosed defaults, omen looks), `keyRig.ts`, `shadowPolicy.ts`, `skyDome.ts`, `horizon.ts`,
  `clouds.ts`, `lightModel.ts`, `lightTint.ts`; read by terrain, render, item_fx and weather.

## How it works
- Sources: a `LightSource` registers once into two sinks, the terrain delta texture
  (`terrain/terrainDynamicLight.ts`, the original's `AddTerrainLight`) and the point-light pool
  (`pointLightPool.ts`). It is driven by a `LightRecipe` (colour, range, flicker or pulse,
  envelope) and an anchor (a position the host mutates, a `follow` callback or a `travel` target).
- Entries own their sources; `LIGHTING_LAYERS` (`layers.ts`) is the only list of them. Each frame
  `TerrainLightSystem` ticks the look director, calls `lighting.update` (all sources, then every
  entry), then updates the pool and the terrain delta. `app/lifecycle.ts` calls `lighting.reset()`
  on a map change, which disposes every source before the entries forget their handles.
- Entries: `mapObjectLights` (torches and lamps, ZzzObject.cpp `MoveObjectSetting` /
  `RenderObjectVisual`), `items` (+9..+15 gear and drops, while improved item effects are on), `characters`
  (ZzzCharacter.cpp:5790-6005), `skills` (ZzzEffect.cpp ranges, cited per row), `objectEffects`
  (level-up, shields, swirl; ours), `sky` (Icarus thunder, ZzzObject.cpp:4204).
- Skill lights: `registerSkills` copies each skill's `light` field into `SKILL_LIGHTS`. A row has
  moments (`cast`, `travel`, `impact`, `area`, `trail`, `follow`, `land`, `hold`, `arrow`,
  `bodies`, `spots`, `strike`, `timed`); `enhanced` replaces moments from the Enhanced tier up.
  Master skills fall back to their base row; unknown wizardry gets `DEFAULT_WIZARDRY_CAST`.
  `trail` lights only run on Ultra.
- Per-map rows live with the map: `MapLayer.lighting` in `versions/shared/maps/<map>/lighting.ts`
  (look over a default, room looks, the object light table from its `spec.ts`, thunder). The
  entries read them through `maps.rowFor` / `maps.worldSet` at run time, never at load. Worlds no
  map claims keep a small `UNCLAIMED` row here (`profiles.ts`: Crywolf 2nd).
- The look: `director.ts` composes `LookState` once a frame from the map's `LookProfile`, the area
  (a tavern), the omen and `GameOptions`, then hands each writer its slice (key rig, shadows, sky
  dome, skyline, AO, haze, post chain). It writes no Babylon state itself. Classic keeps the
  original look; Enhanced and Ultra add the structured key, CSM, SSAO and haze.

## Depends on / used by
- uses: terrain (`terrainDynamicLight`, consts), render (Babylon exports, `materialQuality`,
  `renderingStyle`, `scenes/*` for the director's writers), fx (`MODEL`, particles, effect groups),
  item_fx (`itemVisualTier`), maps, net (`serverTime`), assets, `core`, the `skillsDatabase` and
  map specs in `versions/shared`. Old exceptions to the dependency rule are listed in
  `tools/checks/baselines/deps.json` (options, skill aliases, map specs).
- used by: `controllers.ts`, `app/lifecycle.ts`, ECS systems (terrain light, character light,
  item glow, object effect, skill cast, weapon trail, model loader, character select), skills
  (`define.ts`, `index.ts`, `visuals.ts`), sound (`crackle.ts`), fx, terrain, render, item_fx,
  weather, `modules/events/invasion.ts` (`omen`), every skill file that lights itself, and the
  map specs and object classes in `versions/shared/maps/`.

## Change it
- add an entry: copy `_template.ts` to `<name>.ts`. Keep three parts in order: (1) tuning
  constants and the recipe table, each in real units (tiles, seconds, linear RGB) with why;
  (2) module state and its commands (make lights with `LightSource.attach` and keep the handle so
  `emitters()` can report it); (3) the exported `LightingLayer` with `update` / `reset` /
  `emitters`. Add it to `LIGHTING_LAYERS` in `layers.ts`. What triggers the light (an ECS system,
  a packet handler, a map object class) stays where it happens and calls the command, or a facade
  wrapper when more than one consumer needs it.
- change one skill's light: its `light` field in `versions/shared/skills/<class>/<skill>/index.ts`.
- add a map's torches: rows keyed by object type in the map's `*_LIGHTS` table (its `spec.ts`),
  set as `objectLights` in its `lighting.ts`.
- add an NPC or monster light: `light` in its monster folder (`MonsterLight`: forge, dark,
  carried or flicker); `characters.ts` turns it into a recipe.
- change a map's look: `look` in its `lighting.ts` (only what differs from the open or
  enclosed default; the shared skies are `versions/shared/maps/shared/looks.ts`). A room look:
  `areas` there. Change every map's default: `DEFAULT_PROFILE` / `ENCLOSED_PROFILE` here.

## Tests
- `clouds.test.ts`: cloud uniform values for a clock, scroll wrapping, the sun step, binding.
- `lightingQuality.test.ts`: `sceneTargetSamples` (MSAA per pass, Classic at one sample).
- `recipes.test.ts`: `effectLight` hue, reach and gain ceiling, minimum range.
- `characters.test.ts`: a steady carried glow (Poison Shadow), one that breathes, and the Scorpion's per-frame flicker.
- `effectLights.test.ts`: a card is drawn from the sheet its spec names, one manager per sheet, at
  the sheet's own width and height (checked against the file in `Data`; Shiny02.jpg is twice as tall
  as wide, and grows and resizes both ways); an `unscaled` card keeps its size on a scaled object;
  an `abs` wave breathes on `|sin|`; a `grow` card grows and shrinks, a `spin` card turns from the
  world's clock in whole degrees (two made apart stand at one angle) and a `smoothSpin` one smoothly, a
  `randomAngle` card takes a fresh whole degree every frame; a movable card resizes and turns.
- `mapObjectLightAdapter.test.ts`: a `bone` offset grows with the object, a plain one does not, and a
  record with both pitch and roll turns its offset by `AngleMatrix` (ZzzMathLib.cpp:185-212).
- `mapObjectLights.test.ts`: a row's ground light breathes on its own pulse, else on its flare's, and a
  flicker wins over both.
- `pointLightPool.test.ts`: the slots go to the nearest torches, ranked every frame on one comparator
  and rows kept from frame to frame.
- `versions/shared/maps/mapRows.golden.test.ts`: every world's look, room looks, thunder and
  map-object lights, pinned across the move into the map folders.
- `mapLighting.test.ts`: a look over the open or enclosed default, the sky's default for a map
  with none, room looks by name, object lights and thunder from a registered entry.
- The skill golden tests (`versions/shared/skills/skillTables.golden.test.ts`,
  `skillVisuals.golden.test.ts`) record every skill's light.

## Notes
- `lightSource.ts`: the original lights the ground under about 70 effects every frame they exist
  (ZzzEffect.cpp: BITMAP_FLAME range 3, BITMAP_LIGHTNING 6, MODEL_WAVE 5, MODEL_FISSURE 10, every
  arrow type 2) and under the blacksmith's forge and the Devias trader's brazier
  (ZzzCharacter.cpp); each light dies with its effect. That needs a lifetime with an envelope, a
  moving position and an instant start (the pool's 0.35 s fade-in would turn a lightning strike
  into a swell), so `instant` defaults to true and map lights pass false.
- `characters.ts`: driven by `CharacterLightSystem`, which calls `lightCharacter` /
  `snuffCharacter` for entities with an `npcType`; `heightOffset` is where on the body the light
  hangs. The row is the monster folder's `light` (`MonsterLight`), turned into a recipe here and
  cached per row. Player gear is `items.ts`, not this. Rows marked `improvedOnly` are ours: the floor light
  under a monster that carries a glow (Bahamut's lure, the Lost Tower Shadow); they pulse with
  the glow card (not a `steady` one: the Poison Shadow's card is drawn at Luminosity 1,
  ZzzCharacter.cpp:11308-11318) and are withheld on Classic. A `flicker` row is a carried glow at
  MoveCharacterVisual's per-frame `(rand() % 8 + 2) * 0.1` roll, taken unsmoothed (the Scorpion's tail lamp). A negative row (Tantallos, Death Beam Knight:
  `Vector(-1.3, -1.3, -1.3)`, range 3) darkens the floor: the terrain delta byte has no sign, so
  Classic shows nothing, and the pool on higher tiers carries it as a negative point light.
- `skills.ts` (`ARROW_LIGHTS`): the original lights the arrow body every frame it flies, range 2,
  with `Luminosity = (rand() % 4 + 7) * 0.1` (ZzzEffect.cpp:6764) as the flicker. The arrow is a
  tile off the ground, so its pool is what lights the grass and the shooter. The metal bolts
  (MODEL_ARROW_STEEL, _THUNDER, _LASER, _V, _SAW, _SPARK, _DARKSTINGER) have no light there and no
  row here.
- `clouds.ts` (`VOLUME_SCALE`): the authored scale suits the sky, not the ground. The dome shows
  hundreds of tiles of the deck, the ground about forty, so at one period per 285 tiles a shadow
  became a uniform tint. At 2.2 a cloud is about 130 tiles across and one or two shadows cross the
  view in about a minute; the domain warp hides the repeat. 3 was too fine for the march near the
  horizon (steps of about fifteen tiles) and drew a corrugated stipple.
- `profiles.ts` (`fog.fromTarget`): `start` counts from the camera's target, so the haze keeps its
  distance from the hero at every zoom. Chaos Castle uses it: its black haze starts eight tiles past
  the hero, and it has no `underworld`, since a fog under its flat floor went black at a low camera.
- `profiles.ts` (`underworld`): Devias' ravines are `NoGround` tiles that the ground mesh sends
  past the far plane. The fog is integrated along the ray, so a ray down a hole ends black and a
  ray that stops on a cliff a few tiles down comes back half fogged; there is no edge anywhere.
- `skyDome.ts` (`CLOUD_PLANET_RADIUS`): a flat deck meets a level ray at infinity, so the layer
  used to fade out below 17 degrees, which in first person was half the sky. A shell gives the
  deck a horizon (about 95 tiles overhead, 1050 at eye level) so clouds compress into a band. A
  planet's radius would put that horizon past the map edge.
- `skyDome.ts` (`floor`): without it a ravine shows the clear colour, the same pale blue as the
  sky. The clear colour cannot be darkened because it also fills the top of a downward view. A
  screen-space mask cannot tell a hole from a card against the sky (both are depth 0), and tries
  at it blacked out grass cards on the rim; geometry riding the camera can.

### Lights only one skill uses
A light recipe only one skill uses lives in that skill's file: Flame of Evil's meteor, blast,
hellfire circle and boss laser lights (`versions/shared/skills/monsters/flame_of_evil`), the summon
arrival light (`versions/shared/skills/_shared.ts`). `skills.ts` keeps the shared ones
(`EFFECT_LUMINOSITY`, `DEFAULT_WIZARDRY_CAST`, `ARROW_LIGHTS`, `CAST_HEIGHT`, `ARROW_SECONDS`).
