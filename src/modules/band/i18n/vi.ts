/** Vietnamese text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Đàn guitar',
  'instrument.flute': 'Sáo',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Đàn hạc',
  'instrument.drums': 'Trống',
  'instrument.track': 'Bản nhạc',
  'instrument.notes': 'Nốt nhạc',
  'instrument.owner': 'Người chơi',
  'instrument.you': 'bạn',
  'instrument.unassigned': 'không ai',
  'instrument.startsPlaying': '{name} bắt đầu chơi {instrument}',
  'instrument.stopsPlaying': '{name} ngừng chơi nhạc',
  'instrument.joinsBand': '{name} tham gia ban nhạc của {master}',
  'instrument.leavesBand': '{name} rời ban nhạc',
  'instrument.fileError': 'Tệp này không phải tệp MIDI mà client có thể phát',
  'instrument.unavailable': 'Máy chủ này không hỗ trợ nhạc cụ',
  'instrument.stopped.flood': 'Buổi biểu diễn của bạn đã bị dừng: quá nhiều nốt cùng lúc',
  'instrument.stopped.order': 'Buổi biểu diễn của bạn đã bị dừng: các nốt đến sai thứ tự',
  'instrument.stopped.gone': 'Nhạc công đã rời đi',
  'instrument.refused.cooldown': 'Bạn có thể chơi lại sau {seconds} giây',
  'instrument.refused.busy': 'Bạn đang biểu diễn hoặc đang ở trong một ban nhạc',
  'instrument.refused.full': 'Hiện có quá nhiều nhạc công ở đây',
  'instrument.refused.range': 'Quá xa nhạc công',
  'instrument.refused.map': 'Nhạc công đang ở bản đồ khác',
  'instrument.refused.notPerforming': 'Người chơi đó không biểu diễn',
  'instrument.refused.rate': 'Chậm lại',
} satisfies Partial<Record<keyof typeof en, string>>;
