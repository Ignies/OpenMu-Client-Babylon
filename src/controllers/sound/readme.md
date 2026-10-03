# sound

Everything the player hears: the mixer, map beds, music, footsteps, interface clicks, combat,
monster and drop sounds, and instruments played by players. It knows how to play a sound key,
never which skill or item asks for it.

## Public API
- `sound` (`index.ts`): the facade. `init` boots the mixer at the slider levels; `attach(world)`,
  `update(map, dt)`, `reset()`; readers `unlocked`, `currentMusic`, `musicVolume`, `effectsVolume`,
  `busVolume(bus)`, `isPlaying`, `isLooping`, `heroTile`, `crackling`, `objectLoops`; commands
  `play(key, at?, bus?)`, `playUi`, `playSkill`, `playCombat`, `playMonster`, `playMusic`,
  `stopMusic`, `stop`, `tryUnlock`, `setListener`, `clearListener`, `register(layer)`.
  `index.ts` also re-exports the leaf functions (`playSfx`, `playDrop`, `playSkill`, `COMBAT_BUS`...).
- `sfx.ts`: `playSfx`, `playUiSound`, `uiClick`, `UI_SOUNDS` from the leaf modules, without
  loading the facade. Most UI code imports this.
- `combatSounds.ts`: re-export of the swing, hit, pain, death, pickup and monster voice selectors.
- `recipes.ts`: the `Sounds` key union (`recipes.json` maps a key to its file), `soundUrl`,
  `isMusicKey`, `SOUND_KEYS`.
- `combat.ts`: `SKILL_SOUNDS` (filled by `registerSkills` from each skill's `sound`), `playCombat`,
  `stopCombat`, `playSkill`, `heroCastSound`, `playLandingSound`.
- `listener.ts`: `playSfx(key, at?, { gain, bus, channels })`, the one positioned one-shot path.
- `buses.ts`: `SoundBus`, `BUS_VOLUME_OPTION` (used by the Options window), `busGain`, `masterGain`.
- `packetSounds.ts`: rows and selectors for packet one-shots (traps, spawns, the cherry-blossom
  swirl, the Nightmare teleport, santa emotes), played by `app/logic.ts` and module nets.
- `mapMonsters.ts`, `monsterEffects.ts`: per-map monster cues and `MonsterAttackEffects`, stepped
  by `combatSfxSystem`.
- `objectLoops.ts`: plays the map's object loops (`MapObjectLoop` rows from each map's `sound.ts`).
- `soundsManager.ts`: `SoundsManager`, the mixer (`loadSound`, `loopInstance`, `stopSoundEffect`).
- `instruments/`: `ensureBank`, `bankReady`, `noteOn`, `noteOff`, `allNotesOff`,
  `setPerformerPosition`, `dropPerformer`, `audioNow`, `contextReady`, `instrumentVoices`.
- `loginMusic.ts`: `installLoginMusic()`, called once from `app/boot.tsx`.

## How it works
- The facade holds no state. `soundSystem` calls `sound.attach(world)` once and `sound.update`
  each frame; `app/lifecycle.ts` calls `sound.reset()` on a map change, which also evicts decoded
  effects unused for two maps. Both fan out over `SOUND_LAYERS` (`layers.ts`), the only list of
  entries, in order: the listener first (hero position), then everything that reads it.
- Entries decide what plays and call the mixer (`soundsManager.ts`): two Babylon tracks (music,
  effects) and one `Sound` per key. Loops: `playAmbientLoop` / `loopInstance`; tracks:
  `playMusic` (0.5 s crossfade); one-shots: `playSfx`.
- Volume: master x track (pushed once per slider change), then a category (`buses.ts`) folded
  into each play, then distance: full to 6 tiles, linear to 0 at 28 (`listener.ts`).
  `channels` mirrors the original's `LoadWaveFile` channel count; a key is not restarted within
  40 ms.
- Entries and their sources: beds (`ambientBeds.ts`, SceneManager.cpp:564-700), music
  (`music.ts`, `ManageBackgroundMusic` SceneManager.cpp:1027-1175), footsteps (`footsteps.ts`,
  `PlayWalkSound`, foot-down frames ZzzCharacter.cpp:6241-6249; each map's `MapSound.footsteps`,
  building blocks in `maps/shared/sound.ts`), combat (`combat.ts`, swings
  ZzzCharacter.cpp:1219-1233, pain :1420-1431, death :1477-1487), monster voices (`monsters.ts`, read from the body files in versions/shared/monster_models,
  ZzzOpenData.cpp `OpenMonsterModel`), interface (`ui.ts`, DSPlaySound.h), drops (`drops.ts`),
  NPC noises (`npcVoices.ts`), object loops (`objectLoops.ts`), torch crackle (`crackle.ts`,
  ours) and instruments (`instruments/`).
- A command-only entry (ui, combat, monsters, drops) has no `update` or `reset`.

## Depends on / used by
- uses: lighting (`crackle.ts` reads `lighting.emitters`), assets (data folder URLs, world sets),
  render (Babylon exports), terrain (`TW_SAFEZONE`), anim, actors, `core`, `ecs` types. Old exceptions to the dependency
  rule are listed in `tools/checks/baselines/deps.json` (options, events, hero, items, drops,
  band, skill aliases, `app/store`, `app/consts`).
- used by: `controllers.ts`, `app/boot.tsx`, `app/logic.ts`, `app/lifecycle.ts`, ECS systems
  (sound, combat sfx, skill cast, death, teleport, pets, band, boids, doors), most module nets,
  `skills/index.ts` (`SKILL_SOUNDS`), fx (`playSfx`), interface components, skill files, map
  objects and most windows and pages in `versions/shared/ui/`.

## Change it
- add an entry: copy `_template.ts` to `<name>.ts`. Keep three parts in order: (1) tuning
  constants and tables, each with its real unit (seconds, 0..1 of the track, tiles); (2) module
  state and the readers / commands over it (a looping entry has `update`, a one-shot entry is
  command-only); (3) the exported `SoundLayer`. Add it to `SOUND_LAYERS` in `layers.ts` after the
  listener. Play through the mixer: `playAmbientLoop` / `stopAmbientLoop` for beds, `playMusic`
  for tracks, `playSfx` for positioned one-shots.
- add a sound file: add its key and path to `recipes.json`; the `Sounds` type follows.
- give a skill a cast sound: set `sound` in its `defineSkill` file, not here.
- add a slider category: add it to `SoundBus` and `BUS_VOLUME_OPTION` in `buses.ts`.
- change a map's bed, music, loops or voices: that map's `sound.ts` (`versions/shared/maps/<map>/`).

## Tests
- `buses.test.ts`: slider curves, the unnamed `world` bus, master folded into both tracks.
- `drops.test.ts`: the key per drop, bundled jewels, each drop-sound filter row.
- `footsteps.test.ts`: foot-down frames, no steps in a monster body, Doppelganger snow, the first
  map row that holds. `versions/shared/contentRows.golden.test.ts` pins every map's steps.
- `mapMonsters.test.ts`: cue table sanity, map and hook guards, latches, frame windows, the
  five-tile gate, spawn and period cues, channel caps.
- `monsterEffects.test.ts`: `AttackEffect` rows, the tick queue, Kalima casters.
- `monsters.test.ts`: voice table keys, Devias yetis, Kalima bosses, silent slots.
- `music.test.ts`: map and town tracks, Kanturu state, warps, the music slider at 0.
- `npcVoices.test.ts`: the `PlayMonsterSoundGlobal` voices and their range.
- `objectLoops.test.ts`: the loop table and how copies are handed between sources.
- `packetSounds.test.ts`: traps, meteorite storm, spawns, swirl, Nightmare, santa emotes.
- `ui.test.ts`: `consumeSound`, `upgradedItemSound`.
- `instruments/bank.test.ts`, `sampler.test.ts`, `space.test.ts`: nearest-note pitching and kit
  drums, the envelope, the distance and pan curves.

## Notes
- `ambientBeds.ts`: like the original, every frame plays the current world's beds and stops
  every other bed (`PlayBuffer(..., true)` / `StopBuffer` are idempotent). That shape is what
  makes the mute gates work: Lorencia's wind stops when the hero steps under a roof, not on a map
  change. Birds and bats sound from their boids. The Dungeon rats are not simulated, so a
  one-shot row stands in for them, played at a random point `spread` tiles from the hero (gated by
  the `ambientParticles` option). Doors and gates stay with their objects.
- `buses.ts`: a category is not a track. One key can belong to several categories (`eGem` is a
  jewel landing and a jewel going into the bag) and the mixer keeps one `Sound` per key, so the
  category is chosen per play and folded into that play's volume.
- `crackle.ts`: the original has no torch sound (no `SOUND_FIRE`, `CreateFire` plays nothing).
  This loops the Flame skill's `sFlame` under every lit source whose recipe flickers, rescanned
  every 0.5 s, capped to the nearest 4 and silent past 12 tiles.
- `drops.ts`: a jewel rings (SOUND_JEWEL01), a Gemstone rings differently (SOUND_JEWEL02), zen
  jingles (SOUND_DROP_GOLD01), everything else thuds (SOUND_DROP_ITEM01). The original sounds
  every fresh drop; the `dropSound*` options narrow that. Picking an item up keeps its interface
  chime whatever the filter says.
- `mapMonsters.ts`: every monster added after Season 3 is voiced only here: its
  `OpenMonsterModel` case calls `LoadWaveFile` but never `SetMonsterSound`, so the generic slot
  stays -1 (Raklion, Swamp of Quiet, Karutan, Elbeland, PK Field, Empire Guardian). The Season 2
  maps (Crywolf, Kanturu, Aida, Land of Trials, Kalima's Kundun) voice monsters from per-map move /
  render hooks, re-run every frame the monster is drawn. Dispatch order is the original's: global
  list, Elbeland, Swamp of Quiet, the active map (`TheMapProcess()`), then unguarded hooks. The
  original plays these 2D with a hard 500-unit (five-tile) cutoff; here they stay positioned and
  the cutoff is kept as their range.
- monster voices: only the 74 bodies whose case calls `SetMonsterSound` carry sounds; every
  other body file has five nulls. The generator once filled gaps with goblin placeholders, which is why
  Raklion's Ice Giants used to sound like Noria.
- `npcVoices.ts`: the original re-issues `PlayBuffer` every tick and a `Play` on a sounding channel
  is a no-op, so each row means "start again once finished while the condition holds"
  (`SoundsManager.isPlaying` is that no-op). Two of the three town noises are 2D in the original;
  all three are positioned here because the character set reaches further than the original's
  draw distance. The `PlayMonsterSoundGlobal` voices (Titus, Lugard, the Doppelganger boxes, the
  snowman) stay 2D with their 500-unit cutoff.
- `objectLoops.ts`: covers Elbeland's brooks and gates, Kanturu's wheel, waterfall, gear and
  incubators, the Tower's crystals, Karutan's insects, and the Barracks / Refuge cages, volcano and
  fire pillar. Each frame the nearest `MAX_SOURCES` in reach get a looping mixer instance, at most
  `channels` per sound; a row's `when` gate can mute it (Elbeland's rows in the safe zone).
  Lorencia to Icarus have no such hook in `ZzzObject.cpp`.
- `soundsManager.ts`: music keys are created `streaming` (an `<audio>` element) and always loop,
  so a 2 MB track is never decoded into a 30 MB buffer. Effects are decoded buffers. The two track
  gains are the only gains it owns; `setTrackGains` is their one writer.
- `instruments/index.ts`: the graph is voice (with makeup gain) -> performer limiter -> performer
  gain (distance) -> performer pan -> instruments bus -> limiter -> `Engine.audioEngine.masterGain`,
  so the master slider and background mute reach it; the bus folds master x effects x
  instruments itself because the Babylon track gain nodes are private. The pan is the camera's
  side, not the hero's facing: Babylon keeps the Web Audio listener at the camera, so a
  `PannerNode` would hear from above the hero. Music ducks while a performer is heard nearby.
- `instruments/sampler.ts`: a wind (`manifest.sustained`) plays until note-off then a short
  release; a plucked string keeps its own decay and note-off only damps the tail. Polyphony is
  capped per performer and overall; the oldest voice gives way. Each performer has its own
  limiter ahead of the distance gain: with one limiter after the bus, a nearby performer was held
  at the ceiling and the first fifteen tiles of walking away changed nothing.

## NPC voice data
- The per-NPC rows of `npcVoices.ts` live in each NPC's monster folder
  (`versions/shared/monsters/<name>/index.ts`): `voice` (the town noise) and `globalVoice` (the
  `PlayMonsterSoundGlobal` lines). The layer reads them through the monsters controller with
  `npcVoiceOf(type)` / `globalNpcVoiceOf(type)`. Changing an NPC's noise is editing its folder.
- `npcVoices.test.ts` pins that data (a hash; update it on purpose) and checks every sound is a
  catalogue key.

## Skill sound rules come from the skill files
`SKILL_SOUNDS`, `SKILL_CLIP_SOUNDS` (`clipCastSound`, `hasClipSound`: the Rage Fighter party
buffs' sound follows their coin-tossed clip), `LANDING_SOUNDS` (Drain Life, Lightning Orb,
Weakness, Innovation and their masters) and `SILENT_HERO_CASTS` (Fire Scream) in `combat.ts` are
filled by `registerSkills` from each skill's `sound`, `clipSound`, `soundOnLanding` and
`silentHeroCast`. Change a skill's sound in its file under `versions/shared/skills/`. The
per-monster rows `packetSounds.ts` reads are the monster's own: `quietCasts` (on the monster
folder or its body file), `teleport` (the Nightmare), `stormSkill` (the meteorite trap),
`appearSound` (AppearMonster: Golden Dragon, Assassin, Chief Skeleton Archers 1-6) and
`summonSound` (the Kalima gates by 0x1F).

## A map's own sound (MapLayer.sound)
- A map's beds, one-shots, clocked one-shots, music, town tracks, object loops and monster cues
  are the map's own: `MapSound` in `versions/shared/maps/<map>/sound.ts`, set as `sound` on its
  entry. `ambientBeds.ts`, `music.ts`, `objectLoops.ts` and `mapMonsters.ts` are the engines and
  read the rows through `maps.rowFor` at run time, never at module load. This replaces the per-map
  tables those files used to hold: to change a map's bed, track, loop or voice, edit its
  `sound.ts`.
- Row types (`MapSound`, `MapAmbientBed`, `MapAmbientOneShot`, `AmbientTimed`, `AmbientGate`,
  `MapTown`, `MapObjectLoop`, `HeroContext`, `MonsterCue`, `VoiceSet`) are exported from
  `index.ts`. A row names its event or option gate (`AmbientGate`: `bloodCastleRunning`,
  `chaosCastleWaiting`, `chaosCastleRunning`, `ambientParticles`) and `ambientBeds.ts` answers it,
  so map data stays plain. An object loop names its reach (`small`, `large` or tiles) and
  `objectLoops.ts` turns it into tiles.
- Left in the engines: the global monster voices (`GLOBAL_VOICES`), the Kanturu tower's event
  music (`kanturuMusic`) and `WD_5UNKNOWN`'s Dungeon track (no map entry claims that world).
  `crackle.ts` has no per-map rows.
- Monster cues: `monsterCues` answers on the entry's own worlds (per world with `byWorld`, the
  Fortress day 2), `monsterCuesAnyMap` from every map (the hooks with no world guard: Land of
  Trials, Aida, Kanturu 1st / 2nd, Kalima's Kundun), merged in `MAP_LAYERS` order.
- Test: `versions/shared/maps/mapRows.golden.test.ts` pins every world's beds, one-shots, timed
  shots, music, town tracks, object loops and monster cues. `mapSound.test.ts`: a registered
  entry's rows are heard without a reload, gates answer the event state, reach turns into tiles,
  unguarded hooks voice every map.
