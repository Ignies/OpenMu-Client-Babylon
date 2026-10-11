import { reaction } from 'mobx';
import { Ecs } from '@/ecs/current';
import { SessionResume } from '../session/sessionResume';
import { onBeforeLogOut } from '../session/sessionExit';
import { serverSetting } from '../servers/serverManifest';
import { MuHelper } from './state';
import { AppState, UIState } from '@/controllers/interface/uiState';

/** After the resume, once the world around the character has loaded. */
const RESTART_MS = 3000;

/**
 * The helper ends with the session. Leaving the world for the character screen or the server list
 * (Switch Character, Select Server, a drop nothing resumes, a kick) stops it, as the original's menu
 * does (`TriggerStop`, NewUICustomMessageBox.cpp:2374, 2406). A drop the automatic reconnect takes
 * over stops it too, and a world that allows it (`server.json` `muHelperAfterReconnect`) has it
 * asked to start again once back in; `toggleMuHelper` still refuses in a safe zone. Readme: "Resume".
 */
export function installResume(): void {
  let wasOn = false;

  // Select Server and Switch Character stop a running helper before the LogOut
  // (NewUICustomMessageBox.cpp:2374, 2406).
  onBeforeLogOut(kind => {
    if (kind !== 'quit' && MuHelper.active) MuHelper.triggerStop();
  });

  // Out of the world: a warp stays in it (LoadingWorld), the resume keeps the page where it was.
  reaction(
    () => AppState.uiState === UIState.World || AppState.uiState === UIState.LoadingWorld,
    inWorld => {
      if (!inWorld) MuHelper.stop();
    }
  );

  // The first attempt of a resume: the socket has just dropped in the world.
  reaction(
    () => SessionResume.active && SessionResume.attempt === 1,
    dropped => {
      if (!dropped) return;
      wasOn = MuHelper.active;
      if (wasOn) MuHelper.setMuHelperStatus(false, 0);
    }
  );

  reaction(
    () => SessionResume.resumed,
    () => {
      const restart = wasOn && serverSetting('muHelperAfterReconnect');
      wasOn = false;
      if (!restart) return;
      setTimeout(() => {
        if (!MuHelper.active && Ecs.world?.playerEntity) MuHelper.toggleMuHelper();
      }, RESTART_MS);
    }
  );
}
