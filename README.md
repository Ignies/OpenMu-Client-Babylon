<img width="1280" height="640" alt="Proyecto nuevo (2)" src="https://github.com/user-attachments/assets/94062c4b-5307-428a-ba95-3bcf214a05c6" />


# Open Mu Client Babylon
One Client to rule them all.

Client for OpenMU made in BabylonJS based of afrokick's JSClient, the client is being developed to work with any version available and connect on the go to different servers either stored in this repo's serverlist.md or added manually to the list.

Current working ~somewhat version is S6EP3; 0.97d ships beside it (tag V097D) and more are to be added down the line.

## Installing your own server

One command sets up everything: OpenMU (installed the OpenMU way, with our plugin added), the
websocket proxy with the band system, map ping and weather, account signup, cash shop,
marketplace, the admin panel and this client. It asks you a few questions and does the rest.

### What you need

- A server (VPS) with **Ubuntu 22.04+ / Debian 12+** (or Rocky/Alma 9), at least **4 GB RAM** and
  **30 GB disk**. Windows 10/11 or Server 2022 also works (see below).
- **Optional:** a domain name. With one, players get HTTPS on `play.<your-domain>`. Without one,
  the server runs on its IP address (fine for testing).

### Step 1: connect to your server

From your own computer, open a terminal (Windows: PowerShell) and log in:

```bash
ssh root@YOUR.SERVER.IP
```

### Step 2: run the installer

Copy this line, paste it into the SSH window and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.sh | sudo bash
```

It installs Git, Docker and Bun if they are missing, downloads this repository and starts the
installer.

### Step 3: answer the questions

- **Address:** your domain (for example `example.com`) or the server's IP. With a domain, create the
  DNS **A records** the installer lists (`play.`, `ws.`, `register.`, `api.`, `admin.`) pointing at
  your server's IP.
- **Passwords:** you create them (database, admin panel, Game Master account). **Write them down.**
- **Features:** band system, map ping, weather, cash shop delivery, marketplace fees. The defaults
  are fine.

The first build takes 10 to 20 minutes. When it finishes, it prints the addresses to open.

### Step 4: play

Open `https://play.<your-domain>` (or `http://YOUR.SERVER.IP`), create an account and log in.

### Afterwards: the `mu` command

| Command | What it does |
|---|---|
| `mu` | Menu with everything below |
| `mu update` | Backs up, downloads the latest changes from GitHub, rebuilds, restarts. Rolls back if something fails |
| `mu config` | Change domain, passwords, features or the OpenMU version |
| `mu status` | Is everything running? |
| `mu logs` | Live logs (`mu logs proxy`, `mu logs openmu-startup`...) |
| `mu backup` / `mu restore` | Save or bring back the database and all service data |
| `mu adopt` | Move an existing hand-made OpenMU server into this setup |

### Windows server

Open **PowerShell as Administrator** and run:

```powershell
irm https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.ps1 | iex
```

It installs Docker Desktop if needed. If Docker Desktop asks for a restart, restart and run the
same line again; it continues where it stopped.

### Already cloned the repository?

From the repository folder: `sudo bash install/install.sh` (Linux) or `install\install.ps1`
(Windows, as Administrator).

More detail, file layout and troubleshooting: [install/readme.md](install/readme.md).

## Developing the client

Needs [Bun](https://bun.sh) and an OpenMU server to connect to (the installer above, or OpenMU's
own [all-in-one compose](https://github.com/MUnique/OpenMU/tree/master/deploy/all-in-one)).

```bash
bun install
bun run dev        # http://localhost:5173/online
bun run proxy      # ws<->tcp bridge, in a second shell
```

The proxy is not optional: a browser cannot open a TCP socket, so every packet to OpenMU goes
through it. It also carries the band system (`BAND=off` disables it, `BAND_MAX_PERFORMERS` (16)
and `BAND_MAX_RECEIVERS` (48) cap it, it needs `TRACK` on).

**No server, no Docker?** `bun run dev` and open <http://localhost:5173/offline> for the
single-player offline demo.


```
[▓▓▓▓▓▓▓▓▓░] Networking & Protocol (9/10):
     [ Packet codec ]: Generated from OpenMU - 242 server→client, 190 client→server classes.
     [ Handlers ]: 127/242 S2C wired, 97/190 C2S sent. Remainder is 0.75/0.95 legacy
                   variants + Castle Siege / Duel / Illusion Temple (systems not built).
     [ Encryption ]: SimpleModulus, Xor3, Xor32 all implemented with key tables.
     [ Transport ]: WS↔TCP proxy, connect-server handshake, server list + live probe.
     [ Offline ]: Single-player /offline demo path works with no server.

[▓▓▓▓▓▓▓▓▓░] Worlds & Maps (9/10):
     [ Coverage ]: 42 map layers registered - every S6 world incl. all 4 Doppelganger,
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
     [ Fidelity ]: Original MU sprite chrome - draggable/resizable MuWindow, MuSprite,
                   MuNumber, MuText, MuFlag, MuLogo. Not a custom skin.

[▓▓▓▓▓▓▓▓▓░] Localization (9/10):
     [ Languages ]: 15 + English source - BG, ZH, FR, DE, IT, JA, KO, PT, RO, RU, ES, TH.
     [ Keys ]: 725 across 34 areas. Layered pack system with a repairs pass.
     [ Live switch ]: In-game language selector, re-renders without reload.

[▓▓▓▓▓▓▓▓▓░] Weather & Ground (9/10):
     [ Rain ]: Rain state, wetness accumulation, puddles underfoot.
     [ Snow ]: Cover, caps, trails ploughed by walking, sink depth, melt from fire
               skills, spray on footfall. All feed the terrain shader.
     [ Footprints ]: 1,932-line system - the single largest subsystem in the repo.
     [ Schedule ]: Ambient weather squalls on a timed schedule per map.

[▓▓▓▓▓▓▓▓░░] Items & Inventory (8/10):
     [ Data ]: one file per item, wire serializer, group/index lookup.
     [ Display ]: Icon pack + manifest, tooltips, stat rolls, computed value, visual
                  tier, legacy effect flags, rest pose/angle/height on the ground.
     [ Systems ]: Jewel upgrade, durability, hotkeys, drop tiers, glow/aura/crackle/
                  sparkle per +level, item effect mode option.
     [ Storage ]: Inventory, Vault, Trade, Personal Shop, Mix slots - one shared model.

[▓▓▓▓▓▓▓▓░░] Combat (8/10):
     [ Timing ]: 10 layers - input gate, attack-time latch, hit-frame callbacks,
                 weapon range, per-skill cast clips + movement, cast targets.
     [ Class specials ]: Nova charge (hold-to-release), Dark Knight combo detection,
                         Rage Fighter Dark Side follow-ups + streak timeout.
     [ Area ]: 0xDB area-hit counters, multi-target resolution.
     [ Feedback ]: Weapon trails, impact effects, blood decals, combat SFX, death visuals.

[▓▓▓▓▓▓▓▓░░] Skills (8/10):
     [ Database ]: Generated from OpenMU S6 SkillsInitializer - full skill table with
                   type, target kind, damage type, class flags.
     [ Master tree ]: 645-line implementation - categories, points, learn blocks,
                      requirement chains, tooltips, master level + exp curve.
     [ Runtime ]: Buff timers, cooldowns/re-use delays, castability checks.
     [ Visuals ]: 155 skill→effect mappings.

[▓▓▓▓▓▓▓▓░░] Effects / VFX (8/10):
     [ Primitives ]: 14 layers - projectiles, models, sprites, particles, columns,
                     rings, auras, joint ribbons, blur, debris, bursts.
     [ Item glow ]: Aura, crackle, sparkle driven per-character by +level.
     [ Recipe table ]: 737 lines of declarative effect data, no hardcoded spawns.

[▓▓▓▓▓▓▓▓░░] Sound (8/10):
     [ Layers ]: 9 - 3D listener, ambient beds, fire crackle, map object loops,
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
     [ Messenger ]: Friend list, online state, letters - read, write, delete.

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
     [ Gap ]: Shadow work is mid-rework - that's what this branch is for.

[▓▓▓▓▓▓▓░░░] Quests (7/10):
     [ Legacy ]: Full Scroll of Emperor chain (571 lines).
     [ Season 6 ]: Quest log with 761 lines - states, progress, rewards.
     [ Support ]: Kill counters, NPC dialogue trees, over-head quest bubbles.
     [ Gap ]: Quest data tables load from files; coverage depends on server config.

[▓▓▓▓▓▓▓░░░] NPCs & Monsters (7/10):
     [ NPCs ]: ~20 bespoke (Baz, Hanzo, Leo, Lumen, Pasi, Zyro, Trainer, Golden
               Archer, Chaos Card Master, guards, girl, man) + geared/plate/generic.
     [ Monsters ]: one folder per monster + model table; 5 bespoke (Budge Dragon, Hound,
                   Skeleton Warrior, Spider) + generic fallback.
     [ Gap ]: Most monsters run through genericMonster rather than bespoke behaviour.

[▓▓▓░░░░░░░] Events (3/10):
     [ Done ]: Blood Castle, Devil Square, Chaos Castle - full state machines,
               ticket handling, match notices, invasion banners.
     [ Missing ]: Castle Siege (25+ packets unhandled), Illusion Temple (9 unhandled),
                  Duel + spectators (9 unhandled), Guild Soccer, Crywolf event logic,
                  Kanturu event logic. Those maps load; the events don't run.

[▓▓▓▓▓▓░░░░] Multi-version Support (6/10):
     [ Contract ]: Version seam exists - GameVersion contract, protocol/data/encryption/
                   features split, _template folder ready.
     [ Shipped ]: season6 and 0.97d, selected at runtime: versions/registry.ts picks the
                  version per server-list entry (or ?version=), one build carries both.
                  0.97d brings its own encryption, packet-variant ranking, feature flags,
                  modulesOff, gate table and asset tree (Data-v097d + only the worlds,
                  models and sounds whose source differs; the rest is Season 6's).
     [ Gap ]: Outbound packets are still the Season 6 layouts, the window chrome is
              still Season 6 art, and 0.97d's World6 (Exile) has no map entry.
```


## Thanks

Built on [afrokick/muonlinejs](https://github.com/afrokick/muonlinejs) (MIT), forked as
[Ignies/muonlinejs](https://github.com/Ignies/muonlinejs) and taken considerably further so created a singular repo: original
`.bmd` assets instead of hand-made `.glb`, the original MU interface instead of a custom one, and
behaviour transcribed from [Munormae/MuOnlineClient](https://github.com/Munormae/MuOnlineClient).
BMD parsing informed by [xulek/muonline-bmd-viewer](https://github.com/xulek/muonline-bmd-viewer).
The server side is [OpenMU](https://github.com/MUnique/OpenMU).
