import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t, type TextKey } from '../../../i18n';
import { Store } from '../../../store';
import {
  assetDownload,
  cancelDownload,
  clearDownloaded,
  loadAssetsIndex,
  startDownload,
  storageUsed,
  type AssetGroup,
} from '../../../common/assetDownload';
import {
  loadPackIndex,
  ORIGINAL_PACK,
  packsBase,
  setActivePack,
  texturePacks,
} from '../../../common/texturePacks';
import { Button, Icon, Progress, Select } from './controls';

/**
 * Fetch the game's assets before entering a world: one row per group with what
 * it costs over the wire, the texture pack (the biggest single thing a player
 * can choose to download), a running total and a progress bar.
 *
 * Sizes are transfer sizes: the build ships a gzip sidecar beside every
 * compressible asset, and a GLB packs to about a quarter of its weight.
 */

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

/** The pack's own files, which the assets index does not cover. */
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

export const DownloadView = observer(() => {
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
  const packBytes = texturePacks.active?.bytes ?? 0;
  const total = assetDownload.selectedTransfer + packBytes;

  const packOptions = [
    { value: ORIGINAL_PACK, label: t('options.texturePack.original') },
    ...texturePacks.available.map(p => ({
      value: p.id,
      label: p.name,
      hint: p.bytes ? mb(p.bytes) : undefined,
    })),
  ];

  if (groups.length === 0) {
    return (
      <div className="ws-placeholder">
        <Icon name="download" />
        <p>{t('download.unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="ws-split scrollable">
      <div className="ws-split-list">
        <div className="ws-rows ws-rows-scroll scrollable">
          {groups.map(group => {
            const on = assetDownload.isChosen(group);
            // The base game is always part of the download.
            const fixed = group.kind === 'core';
            const stored = assetDownload.cached.has(group.id);

            return (
              <button
                type="button"
                key={group.id}
                className={`ws-row ws-check-row${on ? ' is-checked' : ''}`}
                disabled={fixed}
                onClick={uiClick(() => assetDownload.toggle(group))}
              >
                <span className="ws-check">{on && <Icon name="check" />}</span>
                <span className="ws-row-name">
                  {group.kind === 'map' ? group.name : t(GROUP_LABEL[group.kind])}
                </span>
                <span className={`ws-row-end ws-mono${stored ? ' is-gold' : ''}`}>
                  {stored ? t('download.stored') : mb(group.transfer)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ws-split-form scrollable">
        <div className="ws-form">
          <Select
            label={t('options.texturePack')}
            value={texturePacks.activeId}
            options={packOptions}
            onChange={id => void setActivePack(id)}
          />
          <p className="ws-note">{t('options.texturePackHint')}</p>
        </div>

        <div className="ws-total">
          <span>{t('download.total')}</span>
          <span className="ws-mono">
            {mb(total)}
            {packBytes > 0 ? ` (${t('download.withPack')} ${mb(packBytes)})` : ''}
          </span>
        </div>
        <Progress progress={assetDownload.progress} />

        <div className="ws-row-actions">
          {assetDownload.running ? (
            <Button icon="close" onClick={() => cancelDownload()}>
              {t('download.cancel')} {Math.round(assetDownload.progress * 100)}%
            </Button>
          ) : (
            <Button
              icon="download"
              variant="primary"
              onClick={() => void packUrls().then(extra => startDownload(extra))}
            >
              {assetDownload.done ? t('download.again') : t('download.start')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => void clearDownloaded()}>
            {t('download.clear')}
          </Button>
          <Button
            variant="ghost"
            icon="gear"
            onClick={() => {
              Store.optionsEnabled = true;
            }}
          >
            {t('options.title')}
          </Button>
        </div>
        {storage && <p className="ws-note ws-mono">{storage}</p>}
      </div>
    </div>
  );
});
