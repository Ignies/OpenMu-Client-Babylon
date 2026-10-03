# session

The connection life cycle: connect server, game server, login, leaving a session, getting back in
after a dropped socket, and the per-session stats. Most connection state and the socket actions
still live in the central `Store` (`src/app/store.ts`).

## Public API
- `SessionExit.request(kind)` / `SessionExit.available(kind)`: Exit Game, Select Server, Switch
  Character (`kind` is `'quit' | 'servers' | 'characters'`).
- `openSystemMenu()`: Escape on a clear screen opens the Options window; returns true when it did.
- `SessionResume`: the auto-reconnect state machine. `begin()`, `retry()`, `giveUp(reason)`,
  `remember(name)`, `finish()`, plus `attempt`, `step`, `active` for the overlay.
- `SessionStats`: exp, kills and zen since the last reset, with per-hour rates and `msToLevel`.
  `watch()`, `tick()`, `reset()`.
- `configFingerprintLines()`: every game option packed into a hex string, split for the perf overlay.

## How it works
- `net.ts` walks the login flow: `Hello` asks for the server list once, `ConnectionInfo` dials the
  game server (`gameServerTarget` from `servers/serverConfig.ts` picks host and fallback),
  `GameServerEntered` sets `Store.playerId` and shows the login form, `LoginResponse` moves to the
  character list.
- `sessionExit.ts` ports `CSystemMenuMsgBox` (`NewUICustomMessageBox.cpp:2386-2470`): it sends
  `LogOut` with type 0/2/1 and only changes screen when `LogoutResponse` arrives (or after a 5 s
  timeout). The server may also send `LogoutResponse` unprompted; its type decides where we land.
  Escape opens the menu on the world, server and character screens (`UIMng.cpp:692-705`).
- `sessionResume.ts`: when a game-server socket drops while a character is in the world (and the
  `autoReconnect` option is on), it redials `Store.lastGameServer`, sends the same login and selects
  the same character, with backoff 1, 2, 4, 8, 15 s. `boot.tsx` wires it as `Store.resumeHook`.
- `sessionStats.ts` listens to `experienceGained` and watches `Store.playerData.money`; it starts
  only when a panel calls `watch()`. A new character name resets it.
- `configFingerprint.ts`: version byte, packed boolean options, biased number options, language and
  a texture pack digest. `docs/configuration_hex.md` (made by `tools/configHexTable.ts`) is
  the decoder table.
- Store members used: `uiState`, `playerId`, `serverList`, `loginProcessing`, `loginError`,
  `lastGameServer`, `connectToGameServer`, `onGameServerReached`, `sendServerChangeAuthentication`,
  `switchToMapServer`, `onSocketLost`, `loginRequest`, `selectCharacterRequest`,
  `disconnectFromGameServer`, `disconnectFromConnectServer`, `playOnline`.

## Packets
- `Hello`: requests the server list (once).
- `ServerListResponse`: fills `Store.serverList`.
- `ConnectionInfo`: connects to the game server it names.
- `GameServerEntered`: sets the player id; map-server switch and resume take over here.
- `LoginResponse`: character list on success, error on the form otherwise.
- `LogoutResponse`: hands the type to `SessionExit.onResponse`.
- `ChangeMapServerInfo` (`WSclient.cpp:10328`): moves to another game server; port 0 cancels.
- `wsClosed` (bus event): closes the NPC shop and quest windows, then `Store.onSocketLost`.
- Outgoing: `LogOut` (from `SessionExit.request`).

## Depends on / used by
- uses: `app/store.ts`, `servers/serverConfig.ts`, `quests`, `economy`, `social`, `friends/messenger`,
  `options/gameOptions`, `controllers/sound`, `controllers/interface/browserHotkeys`.
- used by: `src/app/logic.ts`, `src/app/boot.tsx`, `hero/net.ts` (`remember`, `finish`),
  `ecs/systems/keyboardInputSystem.ts`, `controllers/render/perfOverlay.ts`,
  `controllers/interface/components/reconnect_overlay`, `tools/configHexTable.ts`.
- windows: `versions/shared/ui/windows/options/` (exit buttons), `windows/session_stats/`,
  `hud/bottom_bar/` (`expTooltip.tsx`, `index.tsx`).

## Change it
- change a login step: `net.ts`, and the matching `Store` action.
- change the exit flow or the Escape rules: `sessionExit.ts`.
- change retry count or backoff: `BACKOFF` in `sessionResume.ts`.
- add a game option: nothing here; run `bun run tools/configHexTable.ts` to rewrite the table.
  Bump `CONFIG_FINGERPRINT_VERSION` if the byte layout itself changes.

## Tests
- `configFingerprint.test.ts`: `configuration_hex.md` matches the options, the layout and lengths,
  the number bias round trip, and the pack digest.

## Notes

### sessionResume.ts
- A browser loses its socket for reasons a desktop client does not see: a sleeping tab, a closed
  lid, a proxy restart, a phone changing network. Before this, all of them meant a kick: back to
  the server list, log in, pick the character again.
- The resume walks that flow by itself: dial the last game server, send the same login the form
  sends, then select the character that was playing. No new packets, same order. Credentials are
  the ones already in the Store for the session; nothing extra is written to disk.
- Guard rails: only after a socket we did not close went away, only while a character was in the
  world, a few attempts with a growing gap, and a Cancel that drops back to the server list.
