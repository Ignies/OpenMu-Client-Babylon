/** Chinese text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': '吉他',
  'instrument.flute': '长笛',
  'instrument.ocarina': '陶笛',
  'instrument.harp': '竖琴',
  'instrument.drums': '架子鼓',
  'instrument.track': '音轨',
  'instrument.notes': '音符',
  'instrument.owner': '演奏者',
  'instrument.you': '你',
  'instrument.unassigned': '无人',
  'instrument.startsPlaying': '{name} 开始演奏{instrument}',
  'instrument.stopsPlaying': '{name} 停止了演奏',
  'instrument.joinsBand': '{name} 加入了 {master} 的乐队',
  'instrument.leavesBand': '{name} 离开了乐队',
  'instrument.fileError': '该文件不是本客户端可以播放的 MIDI 文件',
  'instrument.unavailable': '本服务器不提供乐器',
  'instrument.stopped.flood': '你的演奏已被停止：同时的音符过多',
  'instrument.stopped.order': '你的演奏已被停止：音符到达顺序错误',
  'instrument.stopped.gone': '演奏者已离开',
  'instrument.refused.cooldown': '{seconds} 秒后可以再次演奏',
  'instrument.refused.busy': '你已经在演奏或已在乐队中',
  'instrument.refused.full': '此处演奏者过多',
  'instrument.refused.range': '离演奏者太远',
  'instrument.refused.map': '演奏者在另一张地图',
  'instrument.refused.notPerforming': '该玩家没有在演奏',
  'instrument.refused.rate': '慢一点',
} satisfies Partial<Record<keyof typeof en, string>>;
