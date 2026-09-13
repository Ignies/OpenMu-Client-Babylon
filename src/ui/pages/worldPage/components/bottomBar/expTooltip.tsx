import { observer } from 'mobx-react-lite';
import { SessionStats } from '../../../../../common/sessionStats';
import {
  formatExpPercent,
  formatExpProgress,
  formatTimeToLevel,
} from '../../../../../common/hudFormat';
import { Store } from '../../../../../store';
import { MuTipList, type TipLine } from '../../../../components/skillTooltip';
import { t } from '../../../../../i18n';

/**
 * What the experience strip is worth in numbers. The bar itself only draws
 * tenths through the original's number strip, so the exact figures live in a
 * hover tip - the same box the skill hover tip uses, so no new chrome is
 * invented for it.
 *
 * The time to level is `SessionStats.msToLevel`: the session panel's rate,
 * read here, never recomputed.
 */
export function buildExpTooltip(
  percent: number,
  exp: number,
  next: number,
  msToLevel: number | null
): TipLine[] {
  return [
    { text: '', color: 'white', blank: true },
    { text: t('exp.title'), color: 'blue', bold: true },
    { text: '', color: 'white', blank: true },
    { text: formatExpPercent(percent), color: 'white' },
    { text: formatExpProgress(exp, next), color: 'white' },
    {
      text: `${t('session.toLevel')} ${formatTimeToLevel(msToLevel)}`,
      color: msToLevel === null ? 'gray' : 'white',
    },
  ];
}

export const ExpTooltip = observer(({ x, y }: { x: number; y: number }) => {
  const { expPercent, exp, expToNextLvl } = Store.playerData;

  return (
    <MuTipList
      lines={buildExpTooltip(expPercent, exp, expToNextLvl, SessionStats.msToLevel)}
      x={x}
      y={y}
    />
  );
});
