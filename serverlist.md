# Server list

The worlds this client offers on its start screen, one per line:

`[VERSION:NAME:DESCRIPTION:LANGUAGE:IMAGE](TARGET)`

`VERSION`, `IMAGE` and the description are optional.

## The target

Name your **domain** and the client works the rest out, because it is built
once for everyone and cannot have been compiled knowing your addresses:

| | |
|---|---|
| `play.<domain>` | the client |
| `ws.<domain>` | the proxy the browser opens, since it cannot open a TCP socket |
| `register.<domain>` | the signup page the login window links to |
| `api.<domain>` | the cash shop service |

The connect server is then wherever your proxy reaches it, which is loopback:
the two share a machine.

If that is not your layout, publish the addresses instead - `host:port`, and
`@` plus your proxy - where `host:port` is the connect server **as the proxy
reaches it**, not as a player would:

`[S6EP3:Somewhere:Its own layout:en](10.0.0.4:44405@wss://gate.example.net)`

A world published that way gets no signup link and no shop of its own: it
named a game server, not a domain.

Lines that do not parse are dropped, so the prose around them costs nothing.

[S6EP3:Ignies:Season 6 Episode 3, played in the browser:es](ignies.net)
