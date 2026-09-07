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

## Naming your game servers

The connect server sends the client ids and load percentages and no text at
all, so a world that says nothing here has every game server and every channel
on its select screen labelled `Server 1`, `Server 2`. Name them with a list
written **directly under your entry**, no blank line in between:

```
- 0: Valhalla
  - 0: Peaceful
  - 1: Hard
- 1: Elysium
  - 0: PvP
```

The outer id is the **server group**, `ServerId >> 8` on the wire, and it is
`0` unless you set groups up. The inner id is the game server's own id inside
that group - the `ServerId` from your server's configuration, which for a
single-group world is exactly the number you configured.

Name only what you want named. A world with one group and three channels has
nothing to call the group itself, so it leaves that name empty and names the
rows:

```
- 0:
  - 0: Peaceful
  - 1: Hard
  - 2: Free PvP
```

Anything left out keeps the numbered default, and so does a world that
publishes no list at all. The first line that is not one of these ends the
list, which is why the examples above name nothing.

Lines that do not parse are dropped, so the prose around them costs nothing.

[S6EP3:Ignies:Season 6 Episode 3, played in the browser:es:https://github.com/Ignies/OpenMu-Client-Babylon/blob/main/2651842.jpg?raw=true](ignies.net)
- 0: Testing Server
  - 0: X100 PVP
  - 1: X100 PVE
