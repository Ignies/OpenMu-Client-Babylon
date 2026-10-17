import { reaction } from 'mobx';
import { isOn } from '@/controllers/fidelity';
import { t } from '../../i18n';
import { Hero } from '../hero';
import { addNotification } from '../chat/notify';

/**
 * Ours (`statCommandNotice`): OpenMU answers `/addstr 100` (and `/add str 100`) without a line of
 * text, so the client says how many free points went into which stat once they drop.
 */

type Stat = 'str' | 'agi' | 'vit' | 'ene' | 'cmd';

const COMMAND = /^\/add\s*(str|agi|vit|ene|cmd)\s+\d+/i;
/** The server may answer with a warp for more than one point: give it time. */
const WAIT_MS = 15000;
/** The points may come back one +1 answer at a time: report once they settle. */
const SETTLE_MS = 400;

let stop: (() => void) | null = null;

/** Called with every line `sendChat` sends: watches the free points after a stat command. */
export function watchStatCommand(text: string): void {
  if (!isOn('statCommandNotice')) return;
  const match = COMMAND.exec(text.trim());
  if (!match) return;
  stop?.();

  const stat = match[1].toLowerCase() as Stat;
  const before = Hero.points;
  let settle: ReturnType<typeof setTimeout> | undefined;
  const report = () => {
    const added = before - Hero.points;
    end();
    if (added > 0) addNotification(t('stats.added', { amount: added, stat: t(`stats.name.${stat}`) }));
  };
  const dispose = reaction(
    () => Hero.points,
    () => {
      clearTimeout(settle);
      settle = setTimeout(report, SETTLE_MS);
    }
  );
  const giveUp = setTimeout(() => settle === undefined && end(), WAIT_MS);
  function end(): void {
    dispose();
    clearTimeout(giveUp);
    clearTimeout(settle);
    stop = null;
  }
  stop = end;
}
