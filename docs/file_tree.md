# File tree

One line per folder. Each folder's own `readme.md` says more.

## Root

```
AGENTS.md          start here: rules, layout, where a change goes
docs/              how the parts fit, guidelines, how-to recipes
src/               the engine (same for every game version)
versions/          game content, per version and shared
tools/             converters, codegen, checks and restructure scripts
public/            files served as-is: converted models, icons, fonts, texture packs
Data/ Data-v097d/  original client files per version (converter input, copied into the build)
proxy/             WebSocket proxy between the browser and OpenMU (bun)
cashshop/ marketplace/ register/ ops/   companion services and pages (bun)
install/           the server installer and manager (`mu`): see install/readme.md
openmu/            our OpenMU plugins, one DLL layered on the official OpenMU image
servers/           one folder per listed world: its start-screen image (servers/readme.md)
serverlist.md      the worlds the start screen offers (format inside)
docker/            development container: dev server + proxy from this checkout (docker/readme.md)
.github/           CI workflow, PR and issue templates
```

## src/ - the engine

```
app/               boot (main.tsx, boot.tsx), App.tsx, the Store, logic.ts (installs the modules),
                   lifecycle.ts (what resets on map change)
core/              types, math, rand, queue, event bus, local storage, pathfinding
ecs/               the miniplex world and its per-frame systems
i18n/              text in every language
version/           which game version runs (contract, loader)
controllers/       generic services; controllers.ts starts them, controller.ts is the contract
  actors/          player, monster and npc model objects, wings, weapons on the body
  anim/            clip choice and play speed
  assets/          data folder, downloads, BMD, texture packs (texturePacks.ts)
  camera/          camera layers (mouse look, Battle Castle, PK field)
  combat/          attack timing, ranges, cast targets, skill hook slots (skillHooks.ts)
  fidelity/        Classic / Enhanced / Ultra: the improvement registry and isOn(id)
  fx/              effects.spawn and every effect layer (sprites, particles, models, joints...)
  interface/       window registry (windows.ts), shared widgets (components/), hotkeys, cursor
  item_fx/         item materials, glow tiers, weapon trails
  lighting/        light sources, sky, the skill light engine (skills.ts)
  loading/         loading gates; classic/ is the original loading screen
  maps/            map registry contract (the maps themselves are content)
  net/             sockets, encryption, packet facade, protocols, ping
  render/          model objects, prop batches, shadows, PBR, post passes (scenes/)
  skills/          defineSkill, registerSkills and the skill visual engine (visuals.ts)
  sound/           buses, music, combat sounds, sound manager
  terrain/         terrain loading, grass, water, masks, minimap data
  weather/         rain and snow
modules/           gameplay modules; each has net.ts (packets in) and its state and actions
  band chaos_mix character_select chat combat drops economy events friends gm guild guild_war
  hero inventory items marketplace mu_helper npc_shop options party personal_shop pets quests
  scope (objects in view) servers session skills social trade vault warp world (weather, fireworks)
  _shared/         helpers more than one module net uses
```

## versions/ - content

```
registry.ts        every version the client ships
shared/            content any version can load
  skills/<class>/<skill>/   one folder per skill: index.ts = defineSkill({...}), variants beside it
                            classes: dark_wizard dark_knight fairy_elf magic_gladiator dark_lord
                            summoner rage_fighter monsters common
  ui/windows/<window>/      one folder per window: index.tsx draws, window.ts registers it
  ui/hud/<element>/         bottom bar, minimap, chat, buff bar, name tags...
  ui/pages/<page>/          login, server_select, character_select, preloader, world
  maps/<map>/               one folder per map: spec, create, object classes
  monsters/<name>/          one folder per monster or npc: data (index.ts), model.ts when it has a look of its own
  items/                    item table, launcher arrows
  improvements/             one file per deliberate improvement over the original (Fidelity option)
  objects/                  object enums, sign objects
  packets/                  generated packet codecs (bun run generate)
season6/           Season 6 Episode 3: data paths, packet set, ui overrides
v097d/             0.97d: its own data paths, inventory, pre-game pages
_template/         copy to start a new version
```

## public/ - served files

```
game-assets/ game-assets-v097d/   converted models and textures, per version
packs/                             Season 6 texture packs: index.json lists them, <pack>/pack.json
                                   maps texture names to files. Each version's packs sit beside
                                   its assets (v097d would use packs-v097d/). See texture_packs.md
items/                             item icons
fonts/ ui/ icons/ backdrops/ skyline/ js/   interface art, fonts, decoders
```

## tools/

```
checks/            bun run check (structure), check:lint, check:commits; baselines/ only shrink
restructure/       move.ts (move files and fix imports), aliasImports.ts, the skill and handler splitters
packs/             language pack vocabularies
*.ts               converters (bmdToGlb, ozj, ozt), asset index, copy and compress for the build
```
