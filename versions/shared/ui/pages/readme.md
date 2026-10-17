# pages

The full-screen pages: the pre-game screens and the world page that holds every window.

## Public API
- `PreloaderPage` (`preloader/`): the first screen, pick a world: world list, setup and download
  views, map tour; the login scene loads behind it. Reads `servers` and `Loading`; Play Offline calls
  the `onPlayOffline` prop (`App.tsx` hands in `app/offline.ts`'s `playOffline`).
- `ServersPage` (`server_select/`): the server list and its description bar, and `CLoginMainWin`'s Menu
  (opens `CSysMenuWin`) and Credit (opens `windows/credits`, `CCreditWin`) buttons with the deco. Reads
  `Servers.serverList`, `Servers.selectedServer`, `Session.connectionLost` (`servers`, `session`).
- `LoginPage` (`login/`): the login window, and account creation in its place
  (`registerWindow.tsx`). Reads the login fields of `Session`, `servers`.
- `CharactersPage` (`character_select/`): character plates, the class preview and the create
  window (`CharMakeWin.tsx`; a class the version lacks is greyed out like a locked one). Reads `character_select` (`CharSelect`), `hero`, `servers`.
- `CharacterList` (`character_select/character_list/`): the account's character list (request,
  packets, roster drawn as the line-up plate or as rows). Every character page uses it; see its
  readme.
- `WorldPage` (`world/`): every `world` slot window, then the HUD with every `hud` slot window in
  stacking order, leaving out the windows of modules this world turned off (`world/shown.ts`).
  Toggles `AppState.hudHidden` (`controllers/interface/uiState.ts`) on the hide-interface key.

## How it works
- `src/app/App.tsx` mounts `PreloaderPage`, `ServersPage` and `WorldPage` directly. With `?direct` it mounts
  `preloader/directLoad.tsx` (`DirectLoadPage`, ours from gonzaPollini/mu-season1-client) instead: on a world with
  lighter assets for a player who reads them (`liteAssetsReady`), only the client art, the logo and a bar while every
  group downloads (`controllers/assets/preloadAll.ts`, the game paused), then `Session.playOnline()`; a run that stops
  short offers "Enter anyway". Otherwise it shows `PreloaderPage` as usual. No server branding.
- `App.tsx` loads `LoginPage` and `CharactersPage` from the version's `pregame` UI (`loadVersionUi`):
  `versions/season6/ui` re-exports these, `versions/v097d/ui` has its own, which draws
  `character_list` as rows.
- `world/index.tsx` imports `../../index`, which registers every window and HUD element.
- A page's text is in its `i18n/<code>.ts` (`en.ts` plus one file per language), found by
  `src/i18n`'s glob. A version's own page (v097d login and characters) uses the shared page's keys.

## Depends on / used by
- uses: `src/modules/{servers,session,character_select,hero}`, `controllers/interface/uiState.ts`, `src/controllers/interface`
- used by: `src/app/App.tsx`, `versions/season6/ui/index.ts`,
  `versions/v097d/ui/pregame/charactersPage.tsx` (`character_list`)

## Change it
- redraw a page: edit its folder's `index.tsx`, `layout.ts`, `style.less`.
- a version needs its own login or character page: export it in that version's `pregame`, not here;
  reuse `character_list` for the roster instead of copying it.

## Tests
- `character_select/character_list/roster.test.ts`: the list rules (selection, free slot, status,
  row order).
- `character_select/layout.test.ts`: the create window offers only the classes the version has
  (`offeredBy`, `features.darkLord` / `magicGladiator` / `summoner` / `rageFighter`).
- `world/shown.test.ts`: a window of a module the server turned off leaves the page.
- `preloader/directLoad.test.tsx`: only the bar while it works; the full download only with lighter assets.
- `preloader/loadingRunner.test.tsx`: the runner bar moves its fill and runner by transform, not width or left.
