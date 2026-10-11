import { defineImprovement } from '@/controllers/fidelity';

/**
 * Another player's trade, party or duel request answers itself "no" after 20 s. Classic: the
 * prompt stays until clicked (`CPartyMsgBoxLayout`, `CTradeMsgBoxLayout`, `CDuelMsgBoxLayout`).
 * Read in `modules/social/requestTimeout.ts` (`expireRequest`), wired by `party/net.ts`,
 * `trade/net.ts` and `events/duel.ts`.
 */
export default defineImprovement({
  id: 'requestTimeout',
  preset: 'enhanced',
  labelKey: 'fidelity.requestTimeout',
  hintKey: 'fidelity.requestTimeout.hint',
});
