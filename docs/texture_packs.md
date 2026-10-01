# Texture packs

A texture pack swaps higher-resolution images onto the models already loaded. Geometry and
animation ship once; a pack carries only images.

## Where they live

```
public/packs/                 Season 6 packs (beside public/game-assets/)
  index.json                  { packs: [{ id, name, textures, bytes }] } - what the Options row lists
  upscaled-512/  upscaled-1024/
    pack.json                 "<converter texture name>|<WxH>" -> file in the pack
    Object1/ Item/ Monster/ ...   the images (webp, png or ktx2)
```

Packs are per version: the code takes the version's asset folder and swaps `game-assets` for
`packs` (`packsBase()` in `src/controllers/assets/texturePacks.ts`), so v097d would read
`public/packs-v097d/`. A season 6 pack is never offered to a v097d client.
`VITE_TEXTURE_PACKS_URL` points the client at packs hosted elsewhere.

## How the client uses one

- `loadPackIndex()` reads `index.json`; Options > Texture Pack lists the result.
- Choosing a pack loads its `pack.json` and repoints each live texture with `updateURL`.
- "Original" restores the bytes the glTF loader kept, so no reload is needed.
- Details and the two easy-to-break rules (texture labels, original bytes) are in the header of
  `texturePacks.ts` and its tests.

## Adding a pack

1. Upscale or repaint the textures, keeping the converter's names (`Object1/ston01`).
2. Write them under `public/packs/<pack-id>/` with a `pack.json` mapping each
   `<name>|<WxH>` key to its file (see an existing pack for the format).
3. Add `{ id, name, textures, bytes }` to `public/packs/index.json`.
4. Check it in game: Options > Texture Pack, then switch back to Original.
