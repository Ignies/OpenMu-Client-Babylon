/**
 * Download: fetch the game's assets before entering the world.
 *
 * One row per group with what it costs over the wire, the texture-pack picker
 * on the same screen (it is the biggest single thing a player can choose to
 * download), a running total, and a progress bar.
 *
 * The sizes quoted are transfer sizes, not sizes on disk. The build ships a
 * gzip sidecar beside every compressible asset and a GLB is about a quarter
 * of its weight packed - "329 MB" against "93 MB" is the difference between
 * a player taking the models and skipping them.
 */

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t, type TextKey } from '../../../i18n';
import { MuProgressBar } from '../../components/loadingScreen/progressBar';
import { TexturePackSelect } from '../../components/optionsWindow/texturePackSelect';
import { LanguageSelect } from '../../components/optionsWindow/languageSelect';
import { Store } from '../../../store';
import { TEXT_COLOR } from '../serversPage/layout';
import {
  assetDownload,
  cancelDownload,
  clearDownloaded,
  loadAssetsIndex,
  startDownload,
  storageUsed,
  urlsOf,
  type AssetGroup,
} from '../../../common/assetDownload';
import {
  loadPackIndex,
  packsBase,
  texturePacks,
} from '../../../common/texturePacks';
import { DOWNLOAD_ROW_HEIGHT, DROPDOWN_ROWS, downloadMetrics } from './layout';

/** The shared groups have their own names; a map group is named by its maps. */
const GROUP_LABEL = {
  core: 'download.group.core',
  monsters: 'download.group.monsters',
  audio: 'download.group.audio',
  icons: 'download.group.icons',
} as const satisfies Partial<Record<AssetGroup['kind'], TextKey>>;

const mb = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** The pack's own files, which the index does not cover. */
async function packUrls(): Promise<string[]> {
  const id = texturePacks.activeId;
  if (!id) return [];
  try {
    const res = await fetch(`${packsBase()}${id}/pack.json`);
    if (!res.ok) return [];
    const manifest = (await res.json()) as { textures: Record<string, string> };
    return Object.values(manifest.textures ?? {}).map(f => `${packsBase()}${id}/${f}`);
  } catch {
    return [];
  }
}

export const DownloadTab = observer(() => {
  const m = downloadMetrics();
  const [storage, setStorage] = useState<string | null>(null);

  useEffect(() => {
    void loadAssetsIndex();
    void loadPackIndex();
  }, []);

  useEffect(() => {
    void storageUsed().then(s => {
      if (s) setStorage(`${mb(s.usage)} / ${mb(s.quota)}`);
    });
  }, [assetDownload.done, assetDownload.running]);

  const groups = assetDownload.groups;
  const pack = texturePacks.active;
  const packBytes = pack?.bytes ?? 0;
  const total = assetDownload.selectedTransfer + packBytes;

  if (groups.length === 0) {
    return (
      <div
        className="options-label"
        style={{ position: 'absolute', left: m.x, top: m.listY, width: m.width }}
      >
        {t('download.unavailable')}
      </div>
    );
  }

  const row = (group: AssetGroup) => {
    const on = assetDownload.isChosen(group);
    const fixed = group.kind === 'core';
    const stored = assetDownload.cached.has(group.id);

    return (
      <div
        key={group.id}
        className={`download-row${on ? ' is-on' : ''}${fixed ? ' is-fixed' : ''}`}
        style={{ height: DOWNLOAD_ROW_HEIGHT }}
        onClick={fixed ? undefined : uiClick(() => assetDownload.toggle(group))}
      >
        <span className="download-check">{on ? '[x]' : '[ ]'}</span>
        <span className="download-name" style={{ color: on ? TEXT_COLOR.white : TEXT_COLOR.brightGray }}>
          {group.kind === 'map' ? group.name : t(GROUP_LABEL[group.kind])}
        </span>
        <span className="download-size" style={{ color: stored ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray }}>
          {stored ? t('download.stored') : mb(group.transfer)}
        </span>
      </div>
    );
  };

  return (
    <>
      <div
        className="download-list scrollable"
        style={{ position: 'absolute', left: m.x, top: m.listY, width: m.width, height: m.listHeight }}
      >
        {groups.map(row)}
      </div>

      {/* The picker positions itself from the options window's stylesheet,
          which this screen does not load - so it gets a placed wrapper and
          draws at the wrapper's origin. */}
      <div
        className="download-pack"
        style={{ position: 'absolute', left: m.x, top: m.packY, width: m.width / 2 - 8 }}
      >
        <TexturePackSelect left={0} top={0} width={m.width / 2 - 8} visibleRows={DROPDOWN_ROWS} />
      </div>

      <div
        className="download-pack"
        style={{
          position: 'absolute',
          left: m.x + m.width / 2 + 8,
          top: m.packY,
          width: m.width / 2 - 8,
        }}
      >
        <LanguageSelect left={0} top={0} width={m.width / 2 - 8} visibleRows={DROPDOWN_ROWS} />
      </div>

      <span
        className="options-label"
        style={{ position: 'absolute', left: m.x, top: m.totalY, color: TEXT_COLOR.yellow }}
      >
        {t('download.total')}: {mb(total)}
        {packBytes > 0 ? ` (${t('download.withPack')} ${mb(packBytes)})` : ''}
      </span>

      <div style={{ position: 'absolute', left: m.x, top: m.barY, width: m.width }}>
        <MuProgressBar progress={assetDownload.progress} width={m.width} height={12} />
      </div>

      <div
        className="download-actions"
        style={{ position: 'absolute', left: m.x, top: m.noteY, width: m.width }}
      >
        {assetDownload.running ? (
          <span className="download-action" onClick={uiClick(() => cancelDownload())}>
            {t('download.cancel')} ({Math.round(assetDownload.progress * 100)}%)
          </span>
        ) : (
          <span
            className="download-action"
            onClick={uiClick(() => {
              void packUrls().then(extra => startDownload(extra));
            })}
          >
            {assetDownload.done ? t('download.again') : t('download.start')}
          </span>
        )}

        <span className="download-action" onClick={uiClick(() => void clearDownloaded())}>
          {t('download.clear')}
        </span>

        <span
          className="download-action"
          onClick={uiClick(() => {
            Store.optionsEnabled = true;
          })}
        >
          {t('options.title')}
        </span>

        {storage && <span className="download-storage">{storage}</span>}
      </div>
    </>
  );
});

/** Exported for the test: how many files the current selection would fetch. */
export function selectedFileCount(): number {
  return assetDownload.groups
    .filter(g => assetDownload.isChosen(g))
    .reduce((n, g) => n + urlsOf(g).length, 0);
}
