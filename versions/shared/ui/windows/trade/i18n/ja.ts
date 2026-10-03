/** Japanese text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': '取引',
  'trade.warnCheck': '承認する前にすべてのアイテムを確認してください。',
  'trade.warnAlike': '見た目が同じでも別のアイテムのことがあります。',
  'trade.warnCancel': '取引を中止するとすべて返却されます。',
  'trade.cancel': '取引を中止',
  'trade.offerZen': 'Zen を提示',
  'trade.accept': '取引を承認',
} satisfies Partial<Record<keyof typeof en, string>>;
