# objects

World object model numbers and the signposts that carry real names.

## Public API
- `enum.ts`: `MODEL_*` constants (the original's world object model numbers, `MODEL_TREE01`,
  `MODEL_SIGN01`, ...) and shared enums such as `MonsterActionType`.
- `signs/signObject.ts`: `SignObject` (a `MapTileObject`) and `LorenciaSignObject`, the signs
  that paint a name on their plate.
- `signs/signPlates.ts`: `prefetchSignPlates(objectDir)`, `labelledPlate(...)`, `isSignPlate(key)`,
  `disposeSignPlates()` (the drawn plates, freed on a map change by `app/lifecycle.ts`).
- `signs/signLabels.ts`: `signTypes(world)`, `signLabel(...)`: what each placement says.

## How it works
- Every signpost draws its text from one of three 64x64 textures (`notice`, `snotice`,
  `snotice02`) whose lettering is decorative. `signPlates.ts` fetches the original once, draws it
  eight times larger, patches the title band and writes the real name. The result is a
  `DynamicTexture` bound per mesh, so the shared material is untouched.
- `signLabels.ts` names each placement: a road post names where the road goes (the map, or the
  neighbour map near its gate); a bracket board names the building it hangs on.
- Each map's `create.ts` binds `SignObject` to its sign types. A placement with no label row
  runs as the plain object. Labels redraw on a language change, and the drawn plates are freed on
  a map change so each town's signs do not stay for the session.

## Depends on / used by
- uses: `@/controllers/terrain/mapTileObject`, `@/controllers/render`, `@/controllers/assets`, `@/i18n`
- used by: map `create.ts` files, actors, `app/offline.ts` and many controllers (`MODEL_*` numbers)

## Change it
- name a new sign: add its placement to `signLabels.ts`, bind its type in the map's `create.ts`.
- a new model number: add the `MODEL_*` constant to `enum.ts`.

## Tests
- `signs/signPlates.test.ts`: a map change frees the drawn plates and the next ask draws a new one.
