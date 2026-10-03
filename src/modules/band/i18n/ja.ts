/** Japanese text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'ギター',
  'instrument.flute': 'フルート',
  'instrument.ocarina': 'オカリナ',
  'instrument.harp': 'ハープ',
  'instrument.drums': 'ドラム',
  'instrument.you': 'あなた',
  'instrument.startsPlaying': '{name}が{instrument}を弾き始めた',
  'instrument.stopsPlaying': '{name}が演奏をやめた',
  'instrument.joinsBand': '{name}が{master}のバンドに参加した',
  'instrument.leavesBand': '{name}がバンドを抜けた',
  'instrument.fileError': 'このファイルはこのクライアントで再生できるMIDIではありません',
  'instrument.unavailable': 'このサーバーでは楽器を使えません',
  'instrument.stopped.flood': '演奏が停止されました：一度に音符が多すぎます',
  'instrument.stopped.order': '演奏が停止されました：音符の順序が乱れました',
  'instrument.stopped.gone': '演奏者がいなくなりました',
  'instrument.refused.cooldown': '{seconds}秒後にまた演奏できます',
  'instrument.refused.busy': 'すでに演奏中かバンドに参加しています',
  'instrument.refused.full': '今ここは演奏者が多すぎます',
  'instrument.refused.range': '演奏者から遠すぎます',
  'instrument.refused.map': '演奏者は別のマップにいます',
  'instrument.refused.notPerforming': 'そのプレイヤーは演奏していません',
  'instrument.refused.rate': 'ゆっくり',
} satisfies Partial<Record<keyof typeof en, string>>;
