import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { readBundleHeader, writeAssetBundles } from './assetBundles';

let root: string;

function put(file: string, text: string): void {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

/** An index shaped like `assetsIndex.ts` writes, with one lighter copy and one sidecar. */
const INDEX = {
  built: '',
  sidecars: true,
  groups: [
    {
      id: 'map:1',
      dirs: [
        ['./game-assets/World1/', [['EncTerrain1.att', 3], ['TerrainLight.OZJ', 4]]],
        ['./Data/World1/', [['mini_map.OZT', 5]]],
      ],
      lite: [['./game-assets/World1/', [['TerrainLight.OZJ.webp', 2]]]],
    },
  ],
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'asset-bundles-'));
  put('game-assets/World1/EncTerrain1.att', 'att');
  put('game-assets/World1/EncTerrain1.att.gz', 'gz');
  put('game-assets/World1/TerrainLight.OZJ', 'jpeg');
  put('game-assets/World1/TerrainLight.OZJ.webp', 'wp');
  put('Data/World1/mini_map.OZT', 'mini!');
  put('assets-index.json', JSON.stringify(INDEX));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('writeAssetBundles', () => {
  it('packs each group as the urls a lighter-assets player reads, and records it in the index', async () => {
    await writeAssetBundles(root);

    const index = JSON.parse(readFileSync(join(root, 'assets-index.json'), 'utf8'));
    const { bundle } = index.groups[0];
    expect(bundle).toEqual({ url: './bundles/season6-map_1.bin', bytes: expect.any(Number) });

    const bytes = new Uint8Array(readFileSync(join(root, 'bundles/season6-map_1.bin')));
    expect(bytes.length).toBe(bundle.bytes);
    const { files, start } = readBundleHeader(bytes);
    // The sidecar where one ships, the copy in place of its original, the plain file otherwise.
    expect(files).toEqual([
      ['./game-assets/World1/EncTerrain1.att.gz', 2],
      ['./game-assets/World1/TerrainLight.OZJ.webp', 2],
      ['./Data/World1/mini_map.OZT', 5],
    ]);
    expect(new TextDecoder().decode(bytes.subarray(start))).toBe('gzwpmini!');
  });

  it('leaves out a file the build does not have', async () => {
    rmSync(join(root, 'Data/World1/mini_map.OZT'));
    await writeAssetBundles(root);
    const bytes = new Uint8Array(readFileSync(join(root, 'bundles/season6-map_1.bin')));
    expect(readBundleHeader(bytes).files.map(([key]) => key)).not.toContain('./Data/World1/mini_map.OZT');
  });

  it('names a version index after its version', async () => {
    rmSync(join(root, 'assets-index.json'));
    put('assets-index-v097d.json', JSON.stringify(INDEX));
    await writeAssetBundles(root);
    expect(existsSync(join(root, 'bundles/v097d-map_1.bin'))).toBe(true);
  });
});
