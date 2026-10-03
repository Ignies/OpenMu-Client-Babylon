/** Japanese text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'パーティー',
  'party.leader': 'パーティーリーダー',
  'party.leave': 'パーティーを抜ける',
  'party.kick': '{name} を追放',
  'party.nearby': '近くのプレイヤー',
  'party.nearbyEmpty': 'プレイヤーの隣に立つと招待できます。',
  'party.tradeWith': '{name} と取引',
  'party.notInParty': 'パーティに入っていません。',
  'party.invite': '招待',
  'party.shop': '露店',
} satisfies Partial<Record<keyof typeof en, string>>;
