import { beforeEach, describe, expect, it } from 'vitest';
import { i18n, t } from './index';
import { EN_TEXT, type TextKey } from './recipes';
import {
  SERVER_MESSAGE_PREFIX,
  matchServerText,
  translateServerText,
} from './serverText';

const KEYS = (Object.keys(EN_TEXT) as TextKey[]).filter(key =>
  key.startsWith(SERVER_MESSAGE_PREFIX)
);

const SENTINELS = ['Ann', 'Bob', 'Cid', 'Dan', 'Eve', 'Fay', 'Gil'];

/** The line OpenMU would put on the wire for one catalogue entry. */
function asSent(key: TextKey): string {
  return EN_TEXT[key].replace(
    /\{(\d+)\}/g,
    (_, hole: string) => SENTINELS[Number(hole)]
  );
}

describe('server text', () => {
  beforeEach(() => {
    i18n.setLanguage('en');
  });

  it('recognises every catalogued message as itself', () => {
    // Two entries whose patterns overlap resolve to the same key here, which
    // is the failure this catches - order in `recipes.ts` decides the winner.
    const wrong = KEYS.filter(key => matchServerText(asSent(key))?.key !== key);

    expect(wrong).toEqual([]);
  });

  it('keeps the values the server put in the holes', () => {
    const match = matchServerText('Congratulations, you are Level 42 now.');

    expect(match?.key).toBe('serverMessage.levelUpCongrats');
    expect(match?.params).toEqual({ '0': '42' });
  });

  it('leaves free text alone', () => {
    const notice = 'Server restart in 10 minutes, see you soon!';

    expect(matchServerText(notice)).toBeNull();
    expect(translateServerText(notice)).toBe(notice);
  });

  it('shows the line in the chosen language', () => {
    i18n.setLanguage('es');

    expect(translateServerText('Inventory is full')).toBe(
      t('serverMessage.inventoryFull')
    );
    expect(translateServerText('Inventory is full')).not.toBe(
      'Inventory is full'
    );
  });

  it('carries the values into the translation', () => {
    i18n.setLanguage('es');

    expect(translateServerText('You got killed by Ann')).toContain('Ann');
  });
});
