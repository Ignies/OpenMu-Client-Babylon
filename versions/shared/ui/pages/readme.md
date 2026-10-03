# pages

The full-screen pages: the pre-game screens and the world page that holds every window.

## Public API
- `PreloaderPage` (`preloader/`): the first screen, pick a world: world list, setup and download
  views, map tour; the login scene loads behind it. Reads `servers` and the Store's loading state.
- `ServersPage` (`server_select/`): the server list and its description bar. Reads
  `Store.serverList`, `Store.selectedServer`, `servers`.
- `LoginPage` (`login/`): the login window, and account creation in its place
  (`registerWindow.tsx`). Reads the Store's login state, `servers`.
- `CharactersPage` (`character_select/`): character plates, the class preview and the create
  window (`CharMakeWin.tsx`). Reads `character_select`, `hero`, `servers` and the Store.
- `CharacterList` (`character_select/character_list/`): the account's character list (request,
  packets, roster drawn as the line-up plate or as rows). Every character page uses it; see its
  readme.
- `WorldPage` (`world/`): every `world` slot window, then the HUD with every `hud` slot window in
  stacking order. Toggles `Store.hudHidden` on the hide-interface key.

## How it works
- `src/app/App.tsx` mounts `PreloaderPage`, `ServersPage` and `WorldPage` directly.
- `App.tsx` loads `LoginPage` and `CharactersPage` from the version's `pregame` UI (`loadVersionUi`):
  `versions/season6/ui` re-exports these, `versions/v097d/ui` has its own, which draws
  `character_list` as rows.
- `world/index.tsx` imports `../../index`, which registers every window and HUD element.

## Depends on / used by
- uses: `src/features/{servers,character_select,hero}`, the Store, `src/controllers/interface`
- used by: `src/app/App.tsx`, `versions/season6/ui/index.ts`,
  `versions/v097d/ui/pregame/charactersPage.tsx` (`character_list`)

## Change it
- redraw a page: edit its folder's `index.tsx`, `layout.ts`, `style.less`.
- a version needs its own login or character page: export it in that version's `pregame`, not here;
  reuse `character_list` for the roster instead of copying it.

## Tests
- `character_select/character_list/roster.test.ts`: the list rules (selection, free slot, status,
  row order).
