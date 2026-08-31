# OpenMuJSClient
One Client to rule them all.
## Main server selection screen:
https://github.com/user-attachments/assets/3e5d8266-ea30-4f6a-990d-44006c4b6639

## Character movement + combat:
https://github.com/user-attachments/assets/94b1529d-322d-4655-9fef-e48d447796f0

## Guild creation:
https://github.com/user-attachments/assets/ed5daea2-f9fd-4370-a884-442dfa20843a

## Translation system:
https://github.com/user-attachments/assets/fb16b2db-ec7a-4060-bf26-f0d8cf7d95be

## Item upgrades and new effects:
https://github.com/user-attachments/assets/465fa86a-1a7b-4c26-9794-aba5297c5e19

## Emote wheel:
https://github.com/user-attachments/assets/35c67fab-1c7c-4c41-b5a0-97cc0c90fd6a


This is a client for OpenMU made in BabylonJS, the system is being developed to work with any version available and connect on the go to different kind of servers either stored in this repo's serverlist.md or added manually to the list.

Current working version is S6EP3, more to be added down the line.


## Installing

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) and
[Bun](https://bun.sh) ≥ 1.0.

### 1. The server

```bash
git clone https://github.com/MUnique/OpenMU.git
cd OpenMU/deploy/all-in-one
```

To use the official docker image of OpenMU, run:

```bash
docker compose up -d --no-build
```

OpenMU's admin panel comes up on <http://localhost:80>. Create an account there before logging in.

### 2. The client

```bash
cd client
bun install
bun run dev        # http://localhost:5173/online
bun run proxy      # ws<->tcp bridge, in a second shell
```

The proxy is not optional: a browser cannot open a TCP socket, so every packet to OpenMU goes
through it. Run it next to the client.

**No server, no Docker?** `bun run dev` and open <http://localhost:5173/offline> for the
single-player offline demo.


## Thanks

Built on [afrokick/muonlinejs](https://github.com/afrokick/muonlinejs) (MIT), forked as
[Ignies/muonlinejs](https://github.com/Ignies/muonlinejs) and taken considerably further so created a singular repo: original
`.bmd` assets instead of hand-made `.glb`, the original MU interface instead of a custom one, and
behaviour transcribed from [Munormae/MuOnlineClient](https://github.com/Munormae/MuOnlineClient).
BMD parsing informed by [xulek/muonline-bmd-viewer](https://github.com/xulek/muonline-bmd-viewer).
The server side is [OpenMU](https://github.com/MUnique/OpenMU).
