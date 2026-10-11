# Where things are

| Looking for | Go to |
|---|---|
| a skill's look, sound, light, animation, rules | `versions/shared/skills/<class>/<skill>/index.ts` |
| a master variant of a skill | the other files in that skill's folder |
| how skill looks are played (steps, dispatch, fallbacks) | `src/controllers/skills/visuals.ts` |
| an effect type (sprite, particles, joint, model...) | `src/controllers/fx/<layer>.ts`, listed in `layers.ts` |
| a sound, bus, music | `src/controllers/sound/` |
| lights, sky, the skill light engine | `src/controllers/lighting/` |
| rain, snow, footprints | `src/controllers/weather/` |
| item glow, materials, weapon trails | `src/controllers/item_fx/` |
| a packet's handling | `src/modules/<module>/net.ts` (listener order: `src/modules/modules.ts`) |
| a module's state and actions | `src/modules/<module>/state.ts`, through its `index.ts` (the door) |
| a window or panel | `versions/shared/ui/windows/<window>/` (drawing) + its module (state) |
| a HUD element | `versions/shared/ui/hud/<element>/` |
| shared widgets (tooltip, item grid, frame, button) | `src/controllers/interface/components/` |
| window open/close, z-order, placement | `src/controllers/interface/` |
| a map, its objects | `versions/shared/maps/<map>/` |
| a monster or npc with its own look | `versions/shared/monsters/<name>/model.ts` |
| item table, monster table, skill table | `versions/shared/items/`, `monsters/`, `skills/skillsDatabase.ts` |
| packet definitions | `versions/shared/packets/` (`bun run generate`) |
| a game version's differences | `versions/<id>/` |
| texture packs | `public/packs/` and [../texture_packs.md](../texture_packs.md) |
| per-frame systems | `src/ecs/systems/` |
| text in every language | `src/i18n/` |
| what runs at boot, what resets on map change | `src/app/boot.tsx`, `src/controllers/controllers.ts`, `src/app/lifecycle.ts` |

## Same name, different layer

Some areas have a folder in each layer. Pick by the question: how it looks or is computed is the
engine's; what the server says and the hero's own state is the module's; the data of one thing is
content.

| Area | Engine (`src/controllers/`) | Gameplay (`src/modules/`) | Content (`versions/shared/`) |
|---|---|---|---|
| items | `items/`: what an item is, the registry. `item_rules/`: wire format, stats, requirements, zen, tooltip rules | `inventory/`: the bag, item packets, grid moves | `items/<group>/<item>.ts` |
| skills | `skills/`: `defineSkill`, the visual engine | `skills/`: learned skills, re-use delays, master tree, skill packets | `skills/<class>/<skill>/` |
| combat | `combat/`: when a swing lands, reach, cast clips, aim | `combat/`: attack, hit and kill packets | the skill folders |
| pets | `pets/`: how each pet or mount is drawn | `pets/`: Dark Horse and Raven packets, raven commands | `items/petItems.ts` |
| monsters | `monsters/`: what a monster type is, the registry | `scope/`: monsters entering and leaving view | `monsters/<name>/` |
| maps | `maps/`: the map contract and facade | `warp/`: map changes; `world/`: map-wide packets | `maps/<map>/` |
