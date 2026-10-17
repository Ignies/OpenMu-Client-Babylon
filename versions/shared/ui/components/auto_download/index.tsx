import './style.less';
import { useEffect, useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { assetDownload, cancelDownload, loadAssetsIndex, startDownload, type AssetGroup } from '@/controllers/assets/assetDownload';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { LocalStorage } from '@/core/localStorage';
import { liteAssetsReady } from '@/modules/servers/liteAssets';
import { t, type TextKey } from '@/i18n';
import { DONE_KEY, currentGroup, firstRunDue, isEssential } from './plan';

/**
 * Ours, from gonzaPollini/mu-season1-client: past the worlds page, on a world with lighter assets for
 * a player who reads them (`liteAssetsReady`), the first visit of a build downloads every group into
 * the cache worker: the essentials behind a screen (the game paused, `assetDownload.blocking`), the
 * rest behind a small panel. Mounted by `src/app/App.tsx`. See readme.md.
 */

const DONE_SHOWN_MS = 4000;
const BACKDROP_ART = '/backdrops/character-select.jpeg';
const PHASES: Record<AssetGroup['kind'], TextKey> = {
  core: 'autoDownload.phase.core',
  monsters: 'autoDownload.phase.monsters',
  audio: 'autoDownload.phase.audio',
  icons: 'autoDownload.phase.icons',
  map: 'autoDownload.phase.map',
};

const buildId = () => (typeof BUILD_ID === 'string' ? BUILD_ID : 'dev');
const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
let started = false;

function phaseText(group: AssetGroup | undefined): string {
  return group ? t(PHASES[group.kind], { name: group.name }) : t('autoDownload.phase.core');
}

/** The two runs: the essentials, then everything (cached files skipped). False when not wanted. */
async function firstRun(onRest: () => void): Promise<boolean> {
  if (!firstRunDue(LocalStorage.load(DONE_KEY), buildId())) return false;
  if (!(await liteAssetsReady()) || !(await loadAssetsIndex())) return false;
  assetDownload.chooseOnly(isEssential);
  await startDownload();
  if (!assetDownload.done) return false;
  onRest();
  assetDownload.chooseOnly(() => true);
  await startDownload();
  if (!assetDownload.done) return false;
  LocalStorage.save(DONE_KEY, buildId());
  return true;
}

export const AutoDownload = observer(() => {
  const entered = AppState.uiState >= UIState.Login;
  const [hidden, setHidden] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [phase, setPhase] = useState<'essential' | 'rest'>('essential');

  useEffect(() => {
    if (!entered || started) return;
    started = true;
    void firstRun(() => setPhase('rest')).then(done => {
      if (!done) return;
      setShowDone(true);
      setTimeout(() => setShowDone(false), DONE_SHOWN_MS);
    });
  }, [entered]);

  const screenUp = entered && phase === 'essential' && !skipped && assetDownload.running;
  useEffect(() => {
    runInAction(() => {
      assetDownload.blocking = screenUp;
    });
  }, [screenUp]);

  if (!entered || hidden || !(assetDownload.running || showDone)) return null;

  const percent = Math.floor(assetDownload.progress * 100);
  const total = assetDownload.selectedTransfer;
  const got = total * assetDownload.progress;

  if (screenUp) {
    const group = currentGroup(assetDownload.groups, g => assetDownload.isChosen(g), assetDownload.received);
    return (
      <div className="auto-download-screen" style={{ backgroundImage: `url(${BACKDROP_ART})` }}>
        <div className="auto-download-panel">
          <div className="auto-download-heading">{t('autoDownload.screenTitle')}</div>
          <div className="auto-download-row">
            <span>{phaseText(group)}</span>
            <span>{percent}%</span>
          </div>
          <div className="auto-download-bar is-big">
            <div className="auto-download-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="auto-download-row">
            <span>{t('autoDownload.received', { got: mb(got), total: mb(total) })}</span>
            <span>{t('autoDownload.left', { left: mb(Math.max(0, total - got)) })}</span>
          </div>
          <div className="auto-download-note">{t('autoDownload.screenText')}</div>
          <button className="auto-download-skip" onClick={() => setSkipped(true)}>
            {t('autoDownload.skip')}
          </button>
          <div className="auto-download-note is-small">{t('autoDownload.skipNote')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auto-download">
      <div className="auto-download-title">
        {showDone ? t('autoDownload.done') : t('autoDownload.title')}
        <button onClick={() => setHidden(true)} title={t('autoDownload.hide')}>
          ×
        </button>
      </div>
      <div className="auto-download-bar">
        <div className="auto-download-fill" style={{ width: `${showDone ? 100 : percent}%` }} />
      </div>
      {!showDone && (
        <div className="auto-download-row">
          <span>{`${percent}% · ${mb(got)} / ${mb(total)} MB`}</span>
          <button onClick={cancelDownload}>{t('autoDownload.cancel')}</button>
        </div>
      )}
    </div>
  );
});
