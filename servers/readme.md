# servers

One folder per world listed in [../serverlist.md](../serverlist.md), named after the world in
lowercase snake_case. It holds what the start screen shows for that world:

- `img.<ext>`: the world's picture, linked from its `serverlist.md` line by its raw GitHub URL
  (`https://github.com/Ignies/OpenMu-Client-Babylon/blob/main/servers/<servername>/img.jpg?raw=true`).

## Change it
- add a world's image: put it in `servers/<servername>/img.<ext>` and use that URL as the `IMAGE`
  field of its line. The URL works once the file is on `main`.
