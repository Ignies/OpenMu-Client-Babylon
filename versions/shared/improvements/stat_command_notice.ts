import { defineImprovement } from '@/controllers/fidelity';

/**
 * After `/addstr` and the other stat commands, the system log says how many points went where.
 * Classic: OpenMU's answer alone (it sends no text). Read in `modules/social/statCommandNotice.ts`.
 */
export default defineImprovement({
  id: 'statCommandNotice',
  preset: 'enhanced',
  labelKey: 'fidelity.statCommandNotice',
  hintKey: 'fidelity.statCommandNotice.hint',
});
