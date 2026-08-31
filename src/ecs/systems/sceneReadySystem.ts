import type { ISystemFactory } from '../world';
import { Store } from '../../store';
import { EventBus } from '../../libs/eventBus';

const READY_GRACE_SECONDS = 3;

const MAX_WAIT_SECONDS = 30;

const MIN_SHOW_SECONDS = 0.3;

const MAP_SHARE = 0.35;
const MODEL_SHARE = 0.6;

const MAP_CREEP_PER_SECOND = 0.6;

const MAX_REPORTED = 0.99;

export const SceneReadySystem: ISystemFactory = world => {
  const query = world.with('visibility', 'modelFactory');

  let waited = 0;

  let mapLoaded = false;

  let readyWait = 0;

  let reported = 0;

  const report = (value: number) => {
    reported = Math.max(reported, Math.min(value, MAX_REPORTED));
    Store.setLoadingProgress(reported);
  };

  EventBus.on('warpCompleted', () => {
    mapLoaded = true;
  });

  EventBus.on('requestWarp', () => {
    mapLoaded = false;
    waited = 0;
    readyWait = 0;
    reported = 0;
  });

  const finish = () => {
    Store.setLoadingProgress(1);
    Store.setSceneLoading(false);
    readyWait = 0;
    waited = 0;
    reported = 0;
  };

  return {
    update: (deltaTime: number) => {
      if (!Store.sceneLoading) {
        waited = 0;
        readyWait = 0;
        return;
      }

      waited += deltaTime;

      if (waited > MAX_WAIT_SECONDS) {
        const stuck: string[] = [];

        for (const entity of query) {
          if (entity.visibility.state === 'hidden') continue;

          const model = entity.modelObject;
          if (model?.Ready || model?.LoadFailed) continue;

          stuck.push(
            entity.modelFilePath ?? `model id ${entity.modelId ?? '?'}`
          );
        }

        console.warn(
          `Scene still not ready after ${MAX_WAIT_SECONDS}s - showing it anyway.`,
          stuck.length
            ? `Still waiting on ${stuck.length} model(s): ${[...new Set(stuck)].slice(0, 10).join(', ')}`
            : 'All models loaded; the scene itself never reported ready.'
        );

        finish();
        return;
      }

      if (!mapLoaded || !world.terrain) {
        report(MAP_SHARE * (1 - Math.exp(-waited * MAP_CREEP_PER_SECOND)));
        return;
      }

      let loaded = 0;
      let expected = 0;

      for (const entity of query) {
        if (entity.visibility.state === 'hidden') continue;

        expected++;

        const model = entity.modelObject;

        if (model?.Ready || model?.LoadFailed) loaded++;
      }

      const modelRatio = expected === 0 ? 1 : loaded / expected;

      report(MAP_SHARE + MODEL_SHARE * modelRatio);

      if (loaded < expected) return;

      if (waited < MIN_SHOW_SECONDS) return;

      readyWait += deltaTime;

      if (world.scene.isReady() || readyWait > READY_GRACE_SECONDS) {
        finish();
      }
    },
  };
};
