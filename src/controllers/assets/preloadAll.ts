import { runInAction } from 'mobx';
import { LocalStorage } from '../../core/localStorage';
import { FIRST_RUN_DONE_KEY, assetDownload, loadAssetsIndex, startDownload } from './assetDownload';

const buildId = () => (typeof BUILD_ID === 'string' ? BUILD_ID : 'dev');

/**
 * Ours, from gonzaPollini/mu-season1-client: the `?direct` screen's job. Downloads every group into
 * the cache worker with the game paused (files already cached are skipped, so a repeat visit ends at
 * once) and marks the build done for the first-run download too. `'skipped'`: no assets index (a dev
 * server). `'failed'`: it stopped short (network, cancel); calling again resumes.
 */
export async function preloadAll(): Promise<'done' | 'skipped' | 'failed'> {
  if (!(await loadAssetsIndex())) return 'skipped';
  assetDownload.chooseOnly(() => true);
  runInAction(() => {
    assetDownload.blocking = true;
  });
  try {
    await startDownload();
  } finally {
    runInAction(() => {
      assetDownload.blocking = false;
    });
  }
  if (!assetDownload.done) return 'failed';
  LocalStorage.save(FIRST_RUN_DONE_KEY, buildId());
  return 'done';
}
