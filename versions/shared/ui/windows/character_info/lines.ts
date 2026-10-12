import { t } from '@/i18n';

type DefenseStats = { defense: number; harmonyDefense: number; defenseRate: number; blockingBuff: number };

/** The defense line (NewUICharacterInfoWindow.cpp:977-1017): the defense buff's share joins the full set's tenth, or prints alone. */
export function defenseText(stats: DefenseStats, fullSet: boolean): string {
  const { defense, defenseRate: rate, blockingBuff } = stats;
  if (rate > 0) {
    const bonus = (fullSet ? Math.trunc(rate / 10) : 0) + blockingBuff;
    return fullSet || bonus ? t('charInfo.defenseRateFull', { defense, rate, bonus }) : t('charInfo.defenseRate', { defense, rate });
  }
  // The harmony defense stays out of the tenth (:996).
  return fullSet ? t('charInfo.defenseFull', { defense, bonus: Math.trunc((defense - stats.harmonyDefense) / 10) }) : t('charInfo.defense', { defense });
}
