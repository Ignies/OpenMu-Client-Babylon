# auto_download

Ours, from gonzaPollini/mu-season1-client: the first-run download screen. Mounted by
`src/app/App.tsx` (not a HUD window: those draw only in the world).

## Public API
- `index.tsx`: `AutoDownload`.
- `plan.ts`: `isEssential`, `firstRunDue`, `currentGroup`, `DONE_KEY`.

## How it works
- Once the worlds page's Enter moves the app on (`UIState.Login` or later), and only on a world whose
  build ships lighter assets for a player who reads them (`liteAssetsReady`, `modules/servers`: the
  installer's setting and the `liteAssets` improvement, off on Classic), it runs `startDownload` twice:
  the essentials (`isEssential`: all but the music and the far maps) behind a screen, then every group
  (cached files skipped) behind a small panel at the top. Groups with a bundle come down as one file
  (`controllers/assets`, Bundles).
- While the screen is up `assetDownload.blocking` is set and `app/boot.tsx` draws no frame; "Enter
  anyway" drops the screen and the download goes on under the panel, which has Cancel and a close
  button (the download goes on).
- A finished run stores the build id in `mu_auto_download_build`; that build never runs it again, a new
  one checks its files (cached ones are skipped). A dev server has no index, so nothing happens.
- The MB shown are over the wire (`selectedTransfer`, the copies' when they are read), scaled by the
  run's progress.

## Depends on / used by
- uses: `controllers/assets` (`assetDownload`), `controllers/interface` (`AppState`), `modules/servers`
  (`liteAssetsReady`), `i18n`.
- used by: `src/app/App.tsx`.

## Tests
- `plan.test.ts`: the essential groups, once per build, the group a run is in (bundles by size).
- `index.test.tsx`: nothing on the worlds page or when idle; the screen while the essentials download.
