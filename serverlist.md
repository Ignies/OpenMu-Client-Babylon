# Server list

The worlds this client offers on its start screen, one per line:

`[VERSION:NAME:DESCRIPTION:LANGUAGE:IMAGE](host:port@WSPROXY)`

`VERSION`, `IMAGE` and `@WSPROXY` are optional. `host:port` is the connect
server **as the proxy reaches it**, not as a player would: a browser cannot
open a TCP socket, so the proxy dials the server on the player's behalf, and a
world whose proxy shares a machine with its game server is `127.0.0.1` here.

Lines that do not parse are dropped, so the prose around them costs nothing.

[S6EP3:Ignies:Season 6 Episode 3, played in the browser:es](127.0.0.1:44405@wss://ws.ignies.net:443)
