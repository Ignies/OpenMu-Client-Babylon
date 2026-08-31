import { assetWorldNum } from '../../common/worldAssets';
import type { ENUM_WORLD } from '../../common';
import {
  MinimapMarkerKind,
  parseMinimapData,
  type MinimapMarker,
} from '../../common/minimapData';
import { i18n, onLanguageChanged } from '../../i18n';
import { resolveDataUrl } from './dataFolder';
import { clearSpriteCache, loadMuSprite, type MuSprite } from './sprites';

/**
 * The minimap assets of one world, the way `CNewUIMiniMap::LoadImages` finds
 * them: `Data/World{n}/mini_map.ozt` is the map picture (its absence means
 * "this map has no minimap" — `m_bSuccess = false`, TAB does nothing), and the
 * markers come from the localised `Data/Local/{lang}/Minimap/Minimap_World{n}_{lang}.bmd`.
 * This Data folder also carries the older per-world `World{n}/Minimap.bmd`,
 * whose names are Shift-JIS; it is the fallback when no localised file exists.
 *
 * Loading is in two steps: `prefetchWorldMinimap` on warp warms the browser's
 * HTTP cache for the 4 MB picture (no decode, nothing held), and
 * `loadWorldMinimap` decodes it on the first TAB. One decoded map is kept —
 * the current one — `evictWorldMinimaps` on warp drops the others.
 */

export type WorldMinimap = {
  image: MuSprite;
  markers: MinimapMarker[];
};

const cache = new Map<ENUM_WORLD, Promise<WorldMinimap | null>>();

/**
 * The marker files to try for one world, best first: the active language's
 * pack, then English. `Local/Por/Minimap/` ships both `_por` and `_eng` files,
 * so the fallback is decided per world rather than per language.
 *
 * The Latin packs are windows-1252, not the UTF-8 the English file is
 * (`i18n.dataEncoding` says which) — read as UTF-8 they come back as
 * "Guardi<28>n de Seguridad".
 */
function markerFiles(worldNum: number): { path: string; encoding: string }[] {
  const files: { path: string; encoding: string }[] = [];
  const pack = i18n.dataPack;

  const push = (folder: string, suffix: string, encoding: string) =>
    files.push({
      path: `Local/${folder}/Minimap/Minimap_World${worldNum}_${suffix}.bmd`,
      encoding,
    });

  if (pack && pack.folder !== 'Eng') push(pack.folder, pack.suffix, i18n.dataEncoding);
  push('Eng', 'eng', 'utf-8');

  return files;
}

// The marker names come out of the pack; the picture does not, and
// `loadMuSprite` keeps its own cache, so re-reading a map after a language
// change costs the marker file and nothing else.
onLanguageChanged(() => {
  cache.clear();
});

function minimapImagePath(map: ENUM_WORLD): string {
  return `World${assetWorldNum(map)}/mini_map.OZT`;
}

export function loadWorldMinimap(map: ENUM_WORLD): Promise<WorldMinimap | null> {
  let pending = cache.get(map);

  if (!pending) {
    pending = readWorldMinimap(map).catch(err => {
      cache.delete(map);
      throw err;
    });
    cache.set(map, pending);
  }

  return pending;
}

/** Warm the HTTP cache for the picture; the TGA decode waits for the first TAB. */
export function prefetchWorldMinimap(map: ENUM_WORLD): void {
  if (cache.has(map)) return;
  fetch(resolveDataUrl(minimapImagePath(map))).then(
    res => res.body?.cancel(),
    () => {}
  );
}

/** Drop every decoded minimap but `keep`'s (their blob URLs with them). */
export function evictWorldMinimaps(keep: ENUM_WORLD): void {
  for (const map of [...cache.keys()]) {
    if (map === keep) continue;
    cache.delete(map);
    const key = minimapImagePath(map).toLowerCase();
    clearSpriteCache(path => path === key);
  }
}

async function fetchDataBytes(path: string): Promise<Uint8Array | null> {
  const res = await fetch(resolveDataUrl(path));
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

async function readWorldMinimap(map: ENUM_WORLD): Promise<WorldMinimap | null> {
  const worldNum = assetWorldNum(map);

  let image: MuSprite;
  try {
    image = await loadMuSprite(minimapImagePath(map));
  } catch {
    return null;
  }

  return { image, markers: await readMarkers(worldNum) };
}

/**
 * The localised English files dropped the portal rows of a few worlds
 * (Lorencia's four, Icecity's safe-zone one) that the Japanese per-world
 * files still carry; those are merged back in with their names translated.
 */
const PORTAL_NAME_TRANSLATIONS: Record<string, string> = {
  ダンジョン: 'Dungeon',
  デビアス: 'Devias',
  ノリア: 'Noria',
  ロレン峡谷: 'Valley of Loren',
  ロレンシア: 'Lorencia',
  安全地帯: 'Safe Zone',
};

function translatePortalName(name: string): string {
  return PORTAL_NAME_TRANSLATIONS[name] ?? name;
}

async function readMarkers(worldNum: number): Promise<MinimapMarker[]> {
  const legacy = await fetchDataBytes(`World${worldNum}/Minimap.bmd`);
  const legacyMarkers = legacy ? parseMinimapData(legacy, 'shift_jis') : [];

  for (const { path, encoding } of markerFiles(worldNum)) {
    const bytes = await fetchDataBytes(path);
    if (!bytes) continue;

    const markers = parseMinimapData(bytes, encoding);
    const missingPortals = legacyMarkers.filter(
      marker =>
        marker.kind === MinimapMarkerKind.Portal &&
        !markers.some(
          m => m.kind === MinimapMarkerKind.Portal && m.x === marker.x && m.y === marker.y
        )
    );

    return markers.concat(
      missingPortals.map(marker => ({
        ...marker,
        name: translatePortalName(marker.name),
      }))
    );
  }

  return legacyMarkers.map(marker => ({
    ...marker,
    name: translatePortalName(marker.name),
  }));
}
