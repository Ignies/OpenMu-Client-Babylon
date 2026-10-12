import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { defenseText } from './lines';

// NewUICharacterInfoWindow.cpp:977-1017.
describe('the defense line', () => {
  const stats = { defense: 300, harmonyDefense: 20, defenseRate: 150, blockingBuff: 0 };

  it('prints the rate and, with the full set, a tenth of it', () => {
    expect(defenseText(stats, true)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 15 }));
    expect(defenseText(stats, false)).toBe(t('charInfo.defenseRate', { defense: 300, rate: 150 }));
  });

  it("adds the defense buff's share to the bonus, or prints it alone without the full set (:982-1006)", () => {
    const buffed = { ...stats, blockingBuff: 70 };
    expect(defenseText(buffed, true)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 85 }));
    expect(defenseText(buffed, false)).toBe(t('charInfo.defenseRateFull', { defense: 300, rate: 150, bonus: 70 }));
  });

  it('prints the defense alone without a rate, a tenth without harmony with the full set (:996-1016)', () => {
    const none = { ...stats, defenseRate: 0, blockingBuff: 0 };
    expect(defenseText(none, true)).toBe(t('charInfo.defenseFull', { defense: 300, bonus: 28 }));
    expect(defenseText(none, false)).toBe(t('charInfo.defense', { defense: 300 }));
  });
});
