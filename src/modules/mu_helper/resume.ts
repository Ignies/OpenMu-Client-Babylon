import { reaction } from 'mobx';
import { Ecs } from '@/ecs/current';
import { SessionResume } from '../session/sessionResume';
import { serverSetting } from '../servers/serverManifest';
import { MuHelper } from './state';

/** After the resume, once the world around the character has loaded. */
const RESTART_MS = 3000;

/**
 * A dropped connection ends the server's helper with the old session, so it stops here too. A world
 * that allows it (`server.json` `muHelperAfterReconnect`) has it asked to start again once the
 * automatic reconnect is back in; `toggleMuHelper` still refuses in a safe zone. Readme: "Resume".
 */
export function installResume(): void {
  let wasOn = false;

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
