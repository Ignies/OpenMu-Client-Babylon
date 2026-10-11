import { reaction } from 'mobx';
import { isOn } from '@/controllers/fidelity';

/** How long another player's request waits for an answer (`requestTimeout`, ours). */
export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * A yes/no request from another player (trade, party, duel) answers itself "no" after 20 s, so a
 * prompt left behind does not block the next one. Classic: it stays up until clicked. `read` is
 * the pending request (a new object restarts the clock), `decline` answers it "no".
 */
export function expireRequest(read: () => object | null, decline: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  reaction(read, request => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!request || !isOn('requestTimeout')) return;
    timer = setTimeout(() => {
      timer = null;
      if (read() === request) decline();
    }, REQUEST_TIMEOUT_MS);
  });
}
