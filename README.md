# Open Mu Client Babylon
One Client to rule them all.
## Main server selection screen:
https://github.com/user-attachments/assets/3e5d8266-ea30-4f6a-990d-44006c4b6639

## Character movement + combat:
https://github.com/user-attachments/assets/94b1529d-322d-4655-9fef-e48d447796f0

## Guild creation:
https://github.com/user-attachments/assets/ed5daea2-f9fd-4370-a884-442dfa20843a

## Translation system:
https://github.com/user-attachments/assets/fb16b2db-ec7a-4060-bf26-f0d8cf7d95be

## Item upgrades and new effects:
https://github.com/user-attachments/assets/465fa86a-1a7b-4c26-9794-aba5297c5e19

## Emote wheel:
https://github.com/user-attachments/assets/35c67fab-1c7c-4c41-b5a0-97cc0c90fd6a


Client for OpenMU made in BabylonJS based of afrokick's JSClient, the client is being developed to work with any version available and connect on the go to different servers either stored in this repo's serverlist.md or added manually to the list.


Current working ~somewhat version is S6EP3, more to be added down the line.

## Installing

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) and
[Bun](https://bun.sh) ≥ 1.0.

### 1. The server

```bash
git clone https://github.com/MUnique/OpenMU.git
cd OpenMU/deploy/all-in-one
```

To use the official docker image of OpenMU, run:

```bash
docker compose up -d --no-build
```

OpenMU's admin panel comes up on <http://localhost:80>. Create an account there before logging in.

### 2. The client

```bash
bun install
bun run dev        # http://localhost:5173/online
bun run proxy      # ws<->tcp bridge, in a second shell
```

The proxy is not optional: a browser cannot open a TCP socket, so every packet to OpenMU goes
through it. Run it next to the client.

**No server, no Docker?** `bun run dev` and open <http://localhost:5173/offline> for the
single-player offline demo.


```
[▓▓▓▓▓▓▓▓▓░] Networking & Protocol (9/10):
     [ Packet codec ]: Generated from OpenMU — 242 server→client, 190 client→server classes.
     [ Handlers ]: 127/242 S2C wired, 97/190 C2S sent. Remainder is 0.75/0.95 legacy
                   variants + Castle Siege / Duel / Illusion Temple (systems not built).
     [ Encryption ]: SimpleModulus, Xor3, Xor32 all implemented with key tables.
     [ Transport ]: WS↔TCP proxy, connect-server handshake, server list + live probe.
     [ Offline ]: Single-player /offline demo path works with no server.

[▓▓▓▓▓▓▓▓▓░] Worlds & Maps (9/10):
     [ Coverage ]: 42 map layers registered — every S6 world incl. all 4 Doppelganger,
                   Kalima, Karutan 1/2, Raklion + boss, Empire Guardian, Loren Market.
     [ Bespoke ]: 26 maps have custom object code (Icarus clouds/sky, Atlans anemones &
                  bubble vents, Devias candles, Blood Castle gate/lamps/bones, Chaos
                  Castle arena ring, Lorencia bonfire/beer/bridge).
     [ Terrain ]: Height, attribute, mapping, light, object parsing + map file decryption,
                  all off-thread in a worker. Tile texture arrays, masks, overlays.
     [ Registry ]: Single MAP_LAYERS list, no switch statements anywhere. Clean.
     [ Missing ]: Atlans underwater layer and a few Tarkan/Dungeon extras skipped on purpose.

[▓▓▓▓▓▓▓▓▓░] UI / Interface (9/10):
     [ Windows ]: Inventory, Vault, Trade, NPC Shop, Personal Shop, Chaos Machine,
                  Character Info, Skills, Master Skills (+ exp bar), Quests, Party,
                  Guild, Friends/Letters, Events, Minimap, Options, Command, Move.
     [ HUD ]: Bottom bar, buff bar, damage numbers, party bars, target health bar,
              name tags, emoji bubbles, world labels, notices, cursors, slide help.
     [ Pages ]: Preloader, Login, Server select, Character select + creation.
     [ Fidelity ]: Original MU sprite chrome — draggable/resizable MuWindow, MuSprite,
                   MuNumber, MuText, MuFlag, MuLogo. Not a custom skin.

[▓▓▓▓▓▓▓▓▓░] Localization (9/10):
     [ Languages ]: 15 + English source — BG, ZH, FR, DE, IT, JA, KO, PT, RO, RU, ES, TH.
     [ Keys ]: 725 across 34 areas. Layered pack system with a repairs pass.
     [ Live switch ]: In-game language selector, re-renders without reload.

[▓▓▓▓▓▓▓▓▓░] Weather & Ground (9/10):
     [ Rain ]: Rain state, wetness accumulation, puddles underfoot.
     [ Snow ]: Cover, caps, trails ploughed by walking, sink depth, melt from fire
               skills, spray on footfall. All feed the terrain shader.
     [ Footprints ]: 1,932-line system — the single largest subsystem in the repo.
     [ Schedule ]: Ambient weather squalls on a timed schedule per map.

[▓▓▓▓▓▓▓▓░░] Items & Inventory (8/10):
     [ Data ]: items.json database, wire serializer, group/index lookup.
     [ Display ]: Icon pack + manifest, tooltips, stat rolls, computed value, visual
                  tier, legacy effect flags, rest pose/angle/height on the ground.
     [ Systems ]: Jewel upgrade, durability, hotkeys, drop tiers, glow/aura/crackle/
                  sparkle per +level, item effect mode option.
     [ Storage ]: Inventory, Vault, Trade, Personal Shop, Mix slots — one shared model.

[▓▓▓▓▓▓▓▓░░] Combat (8/10):
     [ Timing ]: 10 layers — input gate, attack-time latch, hit-frame callbacks,
                 weapon range, per-skill cast clips + movement, cast targets.
     [ Class specials ]: Nova charge (hold-to-release), Dark Knight combo detection,
                         Rage Fighter Dark Side follow-ups + streak timeout.
     [ Area ]: 0xDB area-hit counters, multi-target resolution.
     [ Feedback ]: Weapon trails, impact effects, blood decals, combat SFX, death visuals.

[▓▓▓▓▓▓▓▓░░] Skills (8/10):
     [ Database ]: Generated from OpenMU S6 SkillsInitializer — full skill table with
                   type, target kind, damage type, class flags.
     [ Master tree ]: 645-line implementation — categories, points, learn blocks,
                      requirement chains, tooltips, master level + exp curve.
     [ Runtime ]: Buff timers, cooldowns/re-use delays, castability checks.
     [ Visuals ]: 155 skill→effect mappings.

[▓▓▓▓▓▓▓▓░░] Effects / VFX (8/10):
     [ Primitives ]: 14 layers — projectiles, models, sprites, particles, columns,
                     rings, auras, joint ribbons, blur, debris, bursts.
     [ Item glow ]: Aura, crackle, sparkle driven per-character by +level.
     [ Recipe table ]: 737 lines of declarative effect data, no hardcoded spawns.

[▓▓▓▓▓▓▓▓░░] Sound (8/10):
     [ Layers ]: 9 — 3D listener, ambient beds, fire crackle, map object loops,
                 music, footsteps (per surface), UI, combat, monsters.
     [ Monsters ]: 460-line per-monster voice table.
     [ Objects ]: 371-line map-object loop table (waterfalls, torches, machinery).

[▓▓▓▓▓▓▓▓░░] Economy (8/10):
     [ NPC Shop ]: Buy, sell, repair all, price display.
     [ Personal Shop ]: Open, name, price items, browse others, buy, ban list.
     [ Trade ]: Full two-party flow with money, lock states, cancel-returns-all.
     [ Vault ]: Multi-slot, PIN set/remove/unlock, money in/out, level-scaled open cost.
     [ Chaos Machine ]: Mix requests, all crafting result codes handled.

[▓▓▓▓▓▓▓▓░░] Social (8/10):
     [ Chat ]: Filters, history, log sizing/alpha, whisper, system-line dedupe, emotes.
     [ Party ]: Invite, respond, list, kick, HP bars.
     [ Guild ]: Create, join, kick, role assign, alliance, war, relationship changes,
                guild marks + flags rendered in-world.
     [ Messenger ]: Friend list, online state, letters — read, write, delete.

[▓▓▓▓▓▓▓▓░░] Characters & Models (8/10):
     [ Loading ]: Native .bmd parsing (not pre-baked .glb), skeletal animation.
     [ Appearance ]: Standard + extended deserialization, per-class model mapping,
                     female variants, weapon attachment, scale.
     [ Wings ]: Group 12 wings + group 13 capes, correct bone links, per-type passes.
     [ Pets/Mounts ]: Guardian Angel (boid AI), Imp, Uniria, Dinorant, Dark Horse.
     [ Life ]: Head tracking, emote wheel, locomotion, death, rest objects.

[▓▓▓▓▓▓▓░░░] Lighting & Shadows (7/10):  <- active branch
     [ Layers ]: Map object lights, item lights, character lights, skill lights,
                 object effects, sky.
     [ Sinks ]: Terrain dynamic light + point light pool, quality tiers in Options.
     [ In flight ]: sun.ts and skyGobo.ts are new and uncommitted on Improved-Shadows.
     [ Gap ]: Shadow work is mid-rework — that's what this branch is for.

[▓▓▓▓▓▓▓░░░] Quests (7/10):
     [ Legacy ]: Full Scroll of Emperor chain (571 lines).
     [ Season 6 ]: Quest log with 761 lines — states, progress, rewards.
     [ Support ]: Kill counters, NPC dialogue trees, over-head quest bubbles.
     [ Gap ]: Quest data tables load from files; coverage depends on server config.

[▓▓▓▓▓▓▓░░░] NPCs & Monsters (7/10):
     [ NPCs ]: ~20 bespoke (Baz, Hanzo, Leo, Lumen, Pasi, Zyro, Trainer, Golden
               Archer, Chaos Card Master, guards, girl, man) + geared/plate/generic.
     [ Monsters ]: monsters.json + model table; 5 bespoke (Budge Dragon, Hound,
                   Skeleton Warrior, Spider) + generic fallback.
     [ Gap ]: Most monsters run through genericMonster rather than bespoke behaviour.

[▓▓▓░░░░░░░] Events (3/10):
     [ Done ]: Blood Castle, Devil Square, Chaos Castle — full state machines,
               ticket handling, match notices, invasion banners.
     [ Missing ]: Castle Siege (25+ packets unhandled), Illusion Temple (9 unhandled),
                  Duel + spectators (9 unhandled), Guild Soccer, Crywolf event logic,
                  Kanturu event logic. Those maps load; the events don't run.

[▓▓▓▓░░░░░░] Multi-version Support (4/10):
     [ Contract ]: Version seam exists — GameVersion contract, protocol/data/encryption/
                   features split, _template folder ready.
     [ Shipped ]: Only season6, but selection is runtime: versions/registry.ts picks the
                  version per server-list entry, one build carries every version.
     [ Gap ]: The stated goal is all versions in one client; the seam is there,
              the second version is not.
```


## Thanks

Built on [afrokick/muonlinejs](https://github.com/afrokick/muonlinejs) (MIT), forked as
[Ignies/muonlinejs](https://github.com/Ignies/muonlinejs) and taken considerably further so created a singular repo: original
`.bmd` assets instead of hand-made `.glb`, the original MU interface instead of a custom one, and
behaviour transcribed from [Munormae/MuOnlineClient](https://github.com/Munormae/MuOnlineClient).
BMD parsing informed by [xulek/muonline-bmd-viewer](https://github.com/xulek/muonline-bmd-viewer).
The server side is [OpenMU](https://github.com/MUnique/OpenMU).
