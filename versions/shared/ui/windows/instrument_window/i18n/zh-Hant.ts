/** zh-Hant text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': '樂器',
  'instrument.load': '載入 MIDI',
  'instrument.noFile': '尚未載入檔案',
  'instrument.loading': '正在載入樂器……',
  'instrument.play': '播放',
  'instrument.pause': '暫停',
  'instrument.stop': '停止',
  'instrument.loop': '循環',
  'instrument.channels': '聲道',
  'instrument.band': '樂團',
  'instrument.join': '加入',
  'instrument.leave': '離開',
  'instrument.nearby': '附近的演奏者',
  'instrument.none': '附近沒有人在演奏',
} satisfies Partial<Record<keyof typeof en, string>>;
