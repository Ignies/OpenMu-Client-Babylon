# pages

The full-screen pages: the pre-game screens and the world page that holds every window.

## Public API
- `PreloaderPage` (`preloader/`): the first screen, pick a world: world list, setup and download
  views, map tour; the login scene loads behind it. Reads `servers` and `Loading`; Play Offline calls
  the `onPlayOffline` prop (`App.tsx` hands in `app/offline.ts`'s `playOffline`).
- `ServersPage` (`server_select/`): the server list and its description bar. Reads
  `Servers.serverList`, `Servers.selectedServer`, `Session.connectionLost` (`servers`, `session`).
- `LoginPage` (`login/`): the login window, and account creation in its place
  (`registerWindow.tsx`). Reads the login fields of `Session`, `servers`.
- `CharactersPage` (`character_select/`): character plates, the class preview and the create
  window (`CharMakeWin.tsx`). Reads `character_select` (`CharSelect`), `hero`, `servers`.
- `CharacterList` (`character_select/character_list/`): the account's character list (request,
  packets, roster drawn as the line-up plate or as rows). Every character page uses it; see its
  readme.
- `WorldPage` (`world/`): every `world` slot window, then the HUD with every `hud` slot window in
  stacking order. Toggles `AppState.hudHidden` (`app/uiState.ts`) on the hide-interface key.

## How it works
- `src/app/App.tsx` mounts `PreloaderPage`, `ServersPage` and `WorldPage` directly.
- `App.tsx` loads `LoginPage` and `CharactersPage` from the version's `pregame` UI (`loadVersionUi`):
  `versions/season6/ui` re-exports these, `versions/v097d/ui` has its own, which draws
  `character_list` as rows.
- `world/index.tsx` imports `../../index`, which registers every window and HUD element.
- A page's text is in its `i18n/<code>.ts` (`en.ts` plus one file per language), found by
  `src/i18n`'s glob. A version's own page (v097d login and characters) uses the shared page's keys.

## Depends on / used by
- uses: `src/modules/{servers,session,character_select,hero}`, `app/uiState.ts`, `src/controllers/interface`
- used by: `src/app/App.tsx`, `versions/season6/ui/index.ts`,
  `versions/v097d/ui/pregame/charactersPage.tsx` (`character_list`)

## Change it
- redraw a page: edit its folder's `index.tsx`, `layout.ts`, `style.less`.
- a version needs its own login or character page: export it in that version's `pregame`, not here;
  reuse `character_list` for the roster instead of copying it.

## Tests
- `character_select/character_list/roster.test.ts`: the list rules (selection, free slot, status,
  row order).
