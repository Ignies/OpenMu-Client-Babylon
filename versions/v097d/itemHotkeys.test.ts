import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { convertBux } from '@/controllers/terrain/mapFileEncryption';
import { gameVersion } from './index';

const TEXT = new Uint8Array(readFileSync(resolve(__dirname, '../../Data-v097d/Local/Text.bmd')));

/** `GlobalText[n]` of its own `Local/Text.bmd`: 300-byte records, each Bux-encoded. */
function globalText(n: number): string {
  const record = TEXT.slice(n * 300, n * 300 + 300);
  convertBux(record, record.length);
  return String.fromCharCode(...record.subarray(0, record.indexOf(0))).trim();
}

describe('0.97d potion keys', () => {
  it('draws the three fixed slots its own key help lists, with no R and no binding', () => {
    // The F1 help: Q / W / E drink healing, mana and antidote; Ctrl binds skills only.
    expect([130, 131, 132, 134].map(globalText)).toEqual([
      'Q : Use Healing Potion',
      'W : Use Mana Potion',
      'E : Use Antidote',
      'Ctrl+Num: Set hot keys for skills',
    ]);
    expect(gameVersion.features.itemHotkeys).toEqual({ slots: 3, bindable: false });
  });
});
