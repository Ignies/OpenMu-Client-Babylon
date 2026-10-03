/** Japanese text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': '楽器',
  'instrument.load': 'MIDIを読み込む',
  'instrument.noFile': 'ファイルが読み込まれていません',
  'instrument.loading': '楽器を読み込み中...',
  'instrument.play': '再生',
  'instrument.pause': '一時停止',
  'instrument.stop': '停止',
  'instrument.loop': 'ループ',
  'instrument.channels': 'チャンネル',
  'instrument.band': 'バンド',
  'instrument.join': '参加',
  'instrument.leave': '脱退',
  'instrument.nearby': '近くの演奏者',
  'instrument.none': '近くで演奏している人はいません',
} satisfies Partial<Record<keyof typeof en, string>>;
