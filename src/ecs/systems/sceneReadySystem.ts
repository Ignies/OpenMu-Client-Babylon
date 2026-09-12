import type { ISystemFactory } from '../world';
import { Store, UIState } from '../../store';
import { EventBus } from '../../libs/eventBus';
import { isStaged, sceneHeld } from '../../common/sceneGate';

const READY_GRACE_SECONDS = 3;

const MAX_WAIT_SECONDS = 30;

const MIN_SHOW_SECONDS = 0.3;

/**
 * How long the gate may stay shut on actors alone once the map itself is in:
 * the character select line-up, and the hero's own body on world entry. Both
 * come from the server, so neither is guaranteed to arrive - past this the
 * scene is shown without them rather than sitting on the loading art.
 */
const STAGE_WAIT_SECONDS = 10;

const MAP_SHARE = 0.35;
const MODEL_SHARE = 0.6;

const MAP_CREEP_PER_SECOND = 0.6;

const MAX_REPORTED = 0.99;

export const SceneReadySystem: ISystemFactory = world => {
  const query = world.with('visibility', 'modelFactory');

  let waited = 0;

  let mapLoaded = false;

  let readyWait = 0;

  let stageWait = 0;

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
    stageWait = 0;
    reported = 0;
  });

  /**
   * The actors the screen is about to be judged on. Systems that stage their
   * own content hold the gate by name (`sceneGate`); the hero is checked here
   * because entering a world with no body on screen is the same half-load,
   * and nothing else owns it.
   */
  const actorsStaged = () => {
    if (sceneHeld()) return false;

    if (Store.uiState === UIState.World && !isStaged(world.playerEntity)) {
      return false;
    }

    return true;
  };

  const finish = () => {
    Store.setLoadingProgress(1);
    Store.setSceneLoading(false);
    readyWait = 0;
    stageWait = 0;
    waited = 0;
    reported = 0;
  };

  return {
    update: (deltaTime: number) => {
      if (!Store.sceneLoading) {
        waited = 0;
        readyWait = 0;
        stageWait = 0;
        return;
      }

      waited += deltaTime;

      if (waited > MAX_WAIT_SECONDS) {
        const stuck: string[] = [];

        for (const entity of query) {
          if (entity.visibility.state === 'hidden') continue;

          if (isStaged(entity)) continue;

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

        if (isStaged(entity)) loaded++;
      }

      const modelRatio = expected === 0 ? 1 : loaded / expected;

      report(MAP_SHARE + MODEL_SHARE * modelRatio);

      if (loaded < expected) return;

      if (waited < MIN_SHOW_SECONDS) return;

      // The map is in. What is left is whatever the server still owes this
      // screen: the character list its line-up is spawned from, and the
      // hero's body on the way into a world. Bounded on its own clock so a
      // server that never sends them costs ten seconds, not thirty.
      if (stageWait < STAGE_WAIT_SECONDS && !actorsStaged()) {
        stageWait += deltaTime;
        return;
      }

      readyWait += deltaTime;

      if (world.scene.isReady() || readyWait > READY_GRACE_SECONDS) {
        finish();
      }
    },
  };
};
