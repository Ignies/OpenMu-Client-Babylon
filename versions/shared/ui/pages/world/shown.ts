import { windowsIn } from '@/controllers/interface/windows';
import { moduleOn } from '@/modules/module';

/** A slot's windows in stacking order, without those of a module that is off on this server. */
export const shownWindows = (slot: Parameters<typeof windowsIn>[0]) =>
  windowsIn(slot).filter(w => !w.module || moduleOn(w.module));
