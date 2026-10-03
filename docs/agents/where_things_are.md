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
| a module's state and actions | `src/modules/<module>/` (some still in `src/app/store.ts`) |
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
