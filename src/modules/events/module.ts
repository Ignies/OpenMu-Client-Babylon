import { defineModule } from '../module';
import { installDuel } from './duel';
import { installMatchNotices } from './matchNotices';
import { installInvasion } from './invasion';
import { installBloodCastle } from './bloodCastle';
import { installChaosCastle } from './chaosCastle';
import { installDevilSquare } from './devilSquare';
import { installCrywolf } from './crywolf';
import { installGoldenArcher } from './goldenArcher';
import { installKanturu } from './kanturu';
import { installRaklion } from './raklion';

// Optional: a server may run without events (readme.md "When it is off"). A packet several entries
// handle runs them in this order (`MiniGameOpeningState`: Blood Castle, Chaos Castle, Devil Square).
export default defineModule({
  id: 'events',
  install() {
    installDuel();
    installMatchNotices();
    installInvasion();
    installBloodCastle();
    installChaosCastle();
    installDevilSquare();
    installCrywolf();
    installGoldenArcher();
    installKanturu();
    installRaklion();
  },
});
