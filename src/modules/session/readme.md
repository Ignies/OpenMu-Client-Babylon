# session

The connection life cycle: connect server, game server, login, leaving a session, getting back in
after a dropped socket, and the per-session stats. It owns the connection (`Session`): the sockets,
the client-to-server encryption, the login fields and the offline flag.

## Public API
- `Session` (`state.ts`, through `index.ts`, the door): `sendToGS(buffer)` / `sendToCS(buffer)` (every
  packet the client sends), `isOffline`, `gsSocket` / `csSocket`, `connectToConnectServer()`,
  `connectToGameServer(host, port, fallback?)`, `disconnectFrom...()`, `onGameServerReached()`,
  `switchToMapServer(...)`, `sendServerChangeAuthentication(characterName)`, `onSocketLost(socket)`,
  `playOnline()` (back to the server list), `cancelLogin()` (the login Cancel, `LoginWin.cpp:416`), `lastGameServer`, `resumeHook`, `connectionLost`; the
  login fields `username`, `password`, `rememberLogin`, `loginProcessing`, `loginError`,
  `loadAccount(id?, force?)`, `saveLoginData()`, `loginRequest(user, password)`, `retryLogin()`; the
  login tokens: `submitLogin()` / `canSubmitLogin` (the login window's OK: the password typed, or the
  saved token when the field is empty), `savedToken`, `keepsLoginTokens`, `tokenLoginRequest(user,
  token)`, `resumeLogin()` / `canResumeLogin`, `onLoginAccepted()`, `onLoginRefusedToken(invalid)`,
  `keepLoginToken(token)`, `loginAnswered()`; the proxy side frames `sendBandFrame` / `sendPingFrame`.
- `SessionExit.request(kind)` / `SessionExit.available(kind)`: Exit Game, Select Server, Switch
  Character (`kind` is `'quit' | 'servers' | 'characters'`). `onBeforeLogOut(fn)`: runs just before
  the LogOut goes out (mu_helper's `TriggerStop`, which this module may not import).
- `openSystemMenu()`: Escape on a clear screen in the world opens the system menu
  (`SessionExit.menuOpen`, `closeMenu()`; drawn by `versions/shared/ui/windows/system_menu`); returns true
  when it did. The server list and the character screen have their own `CSysMenuWin` (`openPregameMenu`,
  `ecs/systems/keyboardInputSystem.ts`; `system_menu/pregame.tsx`).
- `SessionResume`: the auto-reconnect state machine. `begin()`, `retry()`,
  `giveUp(reason)`, `remember(name)`, `finish()`, plus `attempt`, `step`, `active` for the overlay and
  `resumed` (a count of resumes that got back in, which `mu_helper/resume.ts` reacts to).
- `SessionStats`: exp, kills and zen since the last reset, with per-hour rates and `msToLevel`.
  `watch()`, `tick()`, `reset()`.

## How it works
- `net.ts` walks the login flow: `Hello` asks for the server list once, `ConnectionInfo` dials the
  game server (`gameServerTarget` from `servers/serverConfig.ts` picks host and fallback),
  `GameServerEntered` sets `Hero.playerId` and shows the login form, `LoginResponse` moves to the
  character list.
- `sessionExit.ts` ports `CSystemMenuMsgBox` (`NewUICustomMessageBox.cpp:2386-2470`): it sends
  `LogOut` with type 0/2/1 and only changes screen when `LogoutResponse` arrives (or after a 5 s
  timeout). The server may also send `LogoutResponse` unprompted; its type decides where we land.
  Escape in the world opens the five-button box (`NewUIHotKey.cpp:124`). `CSysMenuWin`'s Select Server
  sends `LogOut(2)` from the character screen too (SysMenuWin.cpp:121-131; OpenMU's `LogoutAction`
  answers it outside the world); its Exit Game leaves without asking, as the original closes the game.
- `sessionResume.ts`: when a game-server socket drops while a character is in the world (and the
  `autoReconnect` option is on), it redials `Session.lastGameServer`, sends the same login and selects
  the same character, with backoff 1, 2, 4, 8, 15 s. `boot.tsx` wires it as `Session.resumeHook`.
- Login tokens (phase 6, [docs/module_streaming.md](../../../docs/module_streaming.md)): on a world
  whose `server.json` offers them, with the improvement `loginTokens` on (Enhanced, Ultra) and
  "remember" ticked (`keepsLoginTokens`), a password login asks for a token (E7 03) and each token the
  server hands out (E7 04) is saved for the account (`servers/serverAccounts.ts`). The next login sends
  the token (E7 05) when the password field is empty; the server answers it with the usual
  `LoginResponse` and sends the replacement token behind it. A token refused as a wrong password is
  dropped and the form asks for the password, the name still filled; so is one that gets no answer in
  10 s (`TOKEN_LOGIN_ANSWER_MS`: a world whose `server.json` offers tokens without our plugin; the
  client has no other login wait). The password is never stored:
  `loadAccount` leaves the field empty, and what was typed stays in memory for this session's
  reconnects. Classic types the password each time.
- `state.ts` sends every packet: Xor32 on all, SimpleModulus on C3/C4 once a game server is dialled.
  A game server that never answers `GameServerEntered` within 4 s (or closes at once) is dialled
  again on the fallback host. A socket we did not close sends the player back to the server list
  (`onSocketLost`), unless the resume takes the loss over. It reads the page and the message box
  from the app and the interface, never a module above it.
- `sessionStats.ts` listens to `experienceGained` and watches `Hero.money`; it starts
  only when a panel calls `watch()`. A new character name resets it.
- Other modules it reads: `Hero` (id, name), `CharSelect` (select after a resume), `Merchant`
  (`closeNpcShop` on a lost socket).

## Packets
- `Hello`: requests the server list (once).
- `ServerListResponse`: fills `Servers.serverList`.
- `ConnectionInfo`: connects to the game server it names.
- `GameServerEntered`: sets the player id; map-server switch and resume take over here.
- `LoginResponse`: character list on success (after a password login, a token request where tokens
  are kept), error on the form otherwise; a token login refused as a wrong password drops the token and
  says so. "Account already connected" sends the same login again (3 times, 2.5 s apart) where the
  world's `server.json` sets `retryLoginWhenConnected`; the original only shows it.
- `LoginTokenAnswer` (E7 04, our OpenMU plugin): an Ok keeps the new token (`Session.keepLoginToken`).
- `LogoutResponse`: hands the type to `SessionExit.onResponse`.
- `ChangeMapServerInfo` (`WSclient.cpp:10328`): moves to another game server; port 0 cancels.
- `wsClosed` (bus event): closes the NPC shop and quest windows, then `Session.onSocketLost`.
- Outgoing: `LogOut` (from `SessionExit.request`); `LoginTokenRequest` (E7 03) and `TokenLogin`
  (E7 05, a C3 like the login, the name Xor3-encoded at the same place).

## Depends on / used by
- uses: `controllers/interface/uiState.ts`, `controllers/fidelity` (`loginTokens`), `servers` (`serverConfig.ts`, `serverAccounts.ts`, `serverManifest.ts`, `Servers`), `hero`,
  `character_select`, `npc_shop`, `quests`, `economy`, `social`, `friends/messenger`,
  `controllers/settings`, `controllers/sound`, `controllers/interface/browserHotkeys`.
- used by: `src/app/logic.ts`, `src/app/boot.tsx`, `hero/net.ts` (`remember`, `finish`), `mu_helper/resume.ts` (`resumed`),
  `ecs/systems/keyboardInputSystem.ts`, `versions/shared/ui/components/reconnect_overlay`.
- windows: `versions/shared/ui/windows/system_menu/`, `windows/session_stats/` (F6),
  `hud/bottom_bar/` (`expTooltip.tsx`, `index.tsx`).

## Change it
- change a login step: `net.ts`, and the matching `Session` action (`state.ts`).
- change the exit flow or the Escape rules: `sessionExit.ts`.
- change retry count or backoff: `BACKOFF` in `sessionResume.ts`.

## Tests
- `state.test.ts`: `sendToGS` sends only the bytes its DataView covers (a view into a larger buffer, as a module's
  packet can be); `cancelLogin` goes back to the server list and keeps the fields.
- `sessionExit.test.ts`: Escape in the world opens the system menu, once, not Options, and nothing off the world;
  Select Server on the character screen sends `LogOut(2)` and leaves on the answer.
- `net.test.ts`: "account already connected" shows the refusal by default and retries only where the
  world asks, then gives up; leaving the login drops a pending retry. Login tokens: a password login
  asks for one and keeps it (never the password); none on Classic, on a world without tokens or with
  "remember" off; an empty password field sends the saved token and keeps its replacement; Classic never
  sends one; a refused token is dropped and the form asks for the password, and so is one unanswered
  for 10 s (fake timers; an answer or a closed socket stops the wait, a password login has none); a
  session that logged in with a token reconnects with the newest.
- the login flow is covered by the listener order golden (`src/app/listenerOrder.golden.test.ts`).

## Notes

### sessionResume.ts
- A browser loses its socket for reasons a desktop client does not see: a sleeping tab, a closed
  lid, a proxy restart, a phone changing network. Before this, all of them meant a kick: back to
  the server list, log in, pick the character again.
- The resume walks that flow by itself: dial the last game server, send the same login the form
  sends, then select the character that was playing. No new packets, same order. Credentials are
  the ones `Session` already holds (the password typed this session, else the newest login token);
  nothing extra is written to disk.
- Guard rails: only after a socket we did not close went away, only while a character was in the
  world, a few attempts with a growing gap, and a Cancel that drops back to the server list.
