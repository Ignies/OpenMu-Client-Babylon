# docker

A development container: the Vite dev server (5173) and the WebSocket proxy (3000) from this
checkout, with the source mounted so edits reload. It is not the server install: a real server
(OpenMU, proxy, services, the built client) is set up by [../install/](../install/readme.md).

## Use it
```
docker compose -f docker/compose.yml up --build
```
Then open http://localhost:5173/online.

## Files
- `compose.yml`: the one service, built from the repository root, ports 5173 and 3000.
- `Dockerfile`: Bun (same version as CI), `bun install`, then `entrypoint.sh`.
- `entrypoint.sh`: starts the proxy and the dev server and stops both when one exits.
