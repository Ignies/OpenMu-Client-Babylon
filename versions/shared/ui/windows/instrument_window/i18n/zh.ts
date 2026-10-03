/** Chinese text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': '乐器',
  'instrument.load': '加载 MIDI',
  'instrument.noFile': '未加载文件',
  'instrument.loading': '正在加载乐器...',
  'instrument.play': '播放',
  'instrument.pause': '暂停',
  'instrument.stop': '停止',
  'instrument.loop': '循环',
  'instrument.channels': '通道',
  'instrument.band': '乐队',
  'instrument.join': '加入',
  'instrument.leave': '离开',
  'instrument.nearby': '附近的演奏者',
  'instrument.none': '附近没有人在演奏',
} satisfies Partial<Record<keyof typeof en, string>>;
