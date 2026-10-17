import { defineImprovement } from '@/controllers/fidelity';

/**
 * A load bar keeps creeping past the last report so it never stands still while a map builds.
 * Classic: the bar shows how far the load is and waits for the next report.
 * Read in `controllers/loading/creep.ts` (`barMotion`), used by the loading screen and preloader bars.
 */
export default defineImprovement({
  id: 'loadBarCreep',
  preset: 'enhanced',
  labelKey: 'fidelity.loadBarCreep',
  hintKey: 'fidelity.loadBarCreep.hint',
});
