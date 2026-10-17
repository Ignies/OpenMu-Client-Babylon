import './directLoad.less';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { assetDownload } from '@/controllers/assets/assetDownload';
import { preloadAll } from '@/controllers/assets/preloadAll';
import { Loading } from '@/controllers/loading';
import { useBarMotion } from '@/controllers/loading/creep';
import { setSceneCovered } from '@/controllers/render/sceneCover';
import { liteAssetsReady } from '@/modules/servers/liteAssets';
import { Session } from '@/modules/session';
import { t } from '@/i18n';

/**
 * Ours, from gonzaPollini/mu-season1-client: the preloader page for `?direct` (`DirectLogin.auto`).
 * On a world with lighter assets for a player who reads them, only a loading bar while every group
 * downloads (`preloadAll`), then the server select (`Session.playOnline`); otherwise the usual
 * preloader (`fallback`). A download that stops short offers "Enter anyway". See pages/readme.md.
 */

const ART = '/backdrops/character-select.jpeg';
const LOGO = '/ui/world_select/logo.webp';
/** After the download, how long the login scene behind may still take before the page leaves anyway. */
const SCENE_WAIT_MS = 15000;

const mb = (bytes: number) => (bytes / 1e6).toFixed(1);

/** `'original'`: the world or the player keeps the original files, so `?direct` does nothing. */
export async function directLoadPlan(
  allowed: () => Promise<boolean> = liteAssetsReady,
  preload: () => Promise<'done' | 'skipped' | 'failed'> = preloadAll
): Promise<'original' | 'done' | 'skipped' | 'failed'> {
  return (await allowed()) ? preload() : 'original';
}

export const DirectLoadPage = observer(({ fallback }: { fallback: ReactNode }) => {
  const [result, setResult] = useState<'working' | 'original' | 'failed' | 'downloaded'>('working');
  const left = useRef(false);

  useEffect(() => {
    let alive = true;
    void directLoadPlan().then(plan => {
      if (alive) setResult(plan === 'original' || plan === 'failed' ? plan : 'downloaded');
    });
    return () => {
      alive = false;
    };
  }, []);

  const covering = result !== 'original';
  useEffect(() => {
    setSceneCovered(covering);
    return () => setSceneCovered(false);
  }, [covering]);

  // The server select draws over the login scene: leave once it is up (or after a while).
  const sceneReady = !Loading.sceneLoading;
  useEffect(() => {
    if (result !== 'downloaded' || left.current) return;
    const go = () => {
      if (left.current) return;
      left.current = true;
      Session.playOnline();
    };
    if (sceneReady) return go();
    const timer = window.setTimeout(go, SCENE_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [result, sceneReady]);

  const progress = result === 'downloaded' ? 1 : assetDownload.progress;
  const { shown, transition } = useBarMotion(progress);
  if (result === 'original') return <>{fallback}</>;

  const percent = Math.floor(progress * 100);
  const total = assetDownload.selectedTransfer;

  return (
    <div className="dl-screen" style={{ backgroundImage: `url(${ART})` }}>
      <div className="dl-main">
        <img className="dl-logo" src={LOGO} alt="" draggable={false} />
        <div className="dl-percent">{percent}%</div>
        <div className="dl-bar">
          <div className="dl-fill" style={{ transform: `scaleX(${shown})`, transition }} />
        </div>
        {total > 0 && (
          <div className="dl-amounts">
            <span>{t('autoDownload.received', { got: mb(total * progress), total: mb(total) })}</span>
            <span>{t('autoDownload.left', { left: mb(Math.max(0, total * (1 - progress))) })}</span>
          </div>
        )}
        {result === 'failed' && (
          <button className="dl-skip" onClick={() => setResult('downloaded')}>
            {t('autoDownload.skip')}
          </button>
        )}
      </div>
    </div>
  );
});
