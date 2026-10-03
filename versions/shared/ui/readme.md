# ui

Everything the player sees on screen that is not the 3D world: windows, HUD elements and pages.
Shared by every game version; a version replaces a window by id.

## Layout
- `windows/<window>/`: one folder per window or panel. `index.tsx` draws it, `window.ts` registers it
  with `defineWindow`. See [windows/readme.md](windows/readme.md).
- `hud/<element>/`: always-on elements (bottom bar, minimap, chat, buff bar, name tags...), same shape.
  See [hud/readme.md](hud/readme.md).
- `pages/<page>/`: login, server_select, character_select, preloader and world.
  See [pages/readme.md](pages/readme.md).
- `<folder>/i18n/<code>.ts`: each window's, element's and page's own text. `i18n/` here holds the
  few keys several of them share (see [i18n/readme.md](i18n/readme.md)).
- `index.ts`: finds every `window.ts` by glob, registers them, adds the interface controller's message
  box and picked-item cursor, then the running version's `ui.windows` overrides.

## How it works
The world page (`pages/world`) draws `windowsIn('world')` under the HUD and `windowsIn('hud')` in
stacking order (`src/controllers/interface/windows.ts`). Each window still decides itself whether it is
open (today from Store flags; these are moving into the interface controller's window manager).

## Depends on / used by
- uses: `src/controllers/interface` (registry, shared widgets), modules and the Store for state.
- used by: `src/app/App.tsx` (pages), versions' UI modules (pre-game pages).

## Change it
- redraw a window: edit its `windows/<window>/index.tsx` only.
- add a window: new folder with `index.tsx` and `window.ts`. Recipe: [docs/how_to/change_a_window.md](../../../docs/how_to/change_a_window.md).
- one version draws it differently: export it in that version's `ui.windows` with the same id.
- change a window's words: its `i18n/` folder ([docs/how_to/add_text.md](../../../docs/how_to/add_text.md)).
