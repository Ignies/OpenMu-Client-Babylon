/** zh-Hant text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': '吉他',
  'instrument.flute': '長笛',
  'instrument.ocarina': '陶笛',
  'instrument.harp': '豎琴',
  'instrument.drums': '爵士鼓',
  'instrument.you': '你',
  'instrument.startsPlaying': '{name}開始演奏{instrument}',
  'instrument.stopsPlaying': '{name}停止了演奏',
  'instrument.joinsBand': '{name}加入了{master}的樂團',
  'instrument.leavesBand': '{name}離開了樂團',
  'instrument.fileError': '此檔案不是本用戶端能播放的 MIDI 檔案',
  'instrument.unavailable': '此伺服器不提供樂器',
  'instrument.stopped.flood': '你的演奏已被中止：同時的音符太多',
  'instrument.stopped.order': '你的演奏已被中止：音符到達的順序錯亂',
  'instrument.stopped.gone': '演奏者已離開',
  'instrument.refused.cooldown': '{seconds}秒後才能再次演奏',
  'instrument.refused.busy': '你已經在演奏或已加入樂團',
  'instrument.refused.full': '此處的演奏者太多',
  'instrument.refused.range': '離演奏者太遠',
  'instrument.refused.map': '演奏者在另一張地圖',
  'instrument.refused.notPerforming': '該玩家沒有在演奏',
  'instrument.refused.rate': '請放慢速度',
} satisfies Partial<Record<keyof typeof en, string>>;
