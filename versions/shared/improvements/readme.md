# improvements

The deliberate improvements over the original client, one file each (`defineImprovement`, from
`src/controllers/fidelity`). The Options window's Fidelity page lists them; the code that deviates
asks `isOn('<id>')`. Classic turns them all off and runs the original.

## Public API
- each `<id_in_snake_case>.ts`: `export default defineImprovement({ id, preset, labelKey, hintKey })`.
- `all.ts`: finds every file here by glob (a disk walk under Bun) and registers them. Imported by
  each version's core module (`versions/<id>/index.ts`), so tests have them too.
- `i18n/<code>.ts`: the labels and hints (`fidelity.<id>`, `fidelity.<id>.hint`), in every language.

## How it works
| id | preset | site | Classic (the original) |
|---|---|---|---|
| `otherPlayersOwnSpeed` | Enhanced | `ecs/systems/animationSystem.ts` | every player at the hero's speeds (ZzzCharacter.cpp:812-1028) |
| `masterBuffCancel` | Enhanced | `controllers/skills/index.ts` (`cancelledEffects`) | skill ids 256+ cancel nothing (BYTE, WSclient.cpp:3884) |
| `archangelFeathers` | Enhanced | `monsters/_archangels/model.ts` | no feathers, 2.7-tile halo on the NPC (ZzzCharacter.cpp:8695-8708) |
| `loginChandeliers` | Enhanced | `maps/loginscene/create.ts` | cold chandeliers (GMEmpireGuardian4.cpp:1050-1053) |
| `wingShadows` | Enhanced | `controllers/actors/wingObject.ts` | wings cast no shadow (ZzzCharacter.cpp:8394-8425) |
| `torchCrackle` | Enhanced | `controllers/sound/crackle.ts` | torches are silent (no `SOUND_FIRE`) |

- The file's comment cites the original and names the site; the site keeps the original path when
  `isOn` is false.
- Never an improvement: anything that changes what the server sees. Holding the hit request until
  the blow lands is a server setting (`heldHitRequest` in the world's `server.json`,
  `src/modules/servers/serverManifest.ts`), not a player choice.
- Some deviations read at build time: `wingShadows` when a wing is created, `loginChandeliers` when
  the login scene loads.

## Depends on / used by
- uses: `src/controllers/fidelity`.
- used by: the version core modules (registration), the Options window (labels).

## Change it
- add one: [docs/how_to/add_improvement.md](../../../docs/how_to/add_improvement.md).
- remove one: delete its file, its `isOn` reads and its text. A stored override for it is ignored.

## Tests
- `improvements.test.ts`: each file registers an id named after it, has its English text, is read
  by an `isOn('<id>')` somewhere and every such read names a registered id; Enhanced keeps them all
  on, Classic turns them off; `cancelledEffects` on Classic and Enhanced.
- `maps/loginscene/create.test.ts`: the chandeliers stay cold on Classic.
