/** Korean text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': '기타',
  'instrument.flute': '플루트',
  'instrument.ocarina': '오카리나',
  'instrument.harp': '하프',
  'instrument.drums': '드럼',
  'instrument.track': '트랙',
  'instrument.notes': '음표',
  'instrument.owner': '연주자',
  'instrument.you': '나',
  'instrument.unassigned': '없음',
  'instrument.startsPlaying': '{name}님이 {instrument} 연주를 시작합니다',
  'instrument.stopsPlaying': '{name}님이 연주를 멈춥니다',
  'instrument.joinsBand': '{name}님이 {master}님의 밴드에 참여합니다',
  'instrument.leavesBand': '{name}님이 밴드를 떠납니다',
  'instrument.fileError': '이 클라이언트에서 재생할 수 있는 MIDI 파일이 아닙니다',
  'instrument.unavailable': '이 서버에서는 악기를 사용할 수 없습니다',
  'instrument.stopped.flood': '연주가 중단되었습니다: 한 번에 음표가 너무 많습니다',
  'instrument.stopped.order': '연주가 중단되었습니다: 음표 순서가 어긋났습니다',
  'instrument.stopped.gone': '연주자가 떠났습니다',
  'instrument.refused.cooldown': '{seconds}초 후에 다시 연주할 수 있습니다',
  'instrument.refused.busy': '이미 연주 중이거나 밴드에 있습니다',
  'instrument.refused.full': '지금 이곳에 연주자가 너무 많습니다',
  'instrument.refused.range': '연주자와 너무 멀리 있습니다',
  'instrument.refused.map': '연주자가 다른 맵에 있습니다',
  'instrument.refused.notPerforming': '그 플레이어는 연주하고 있지 않습니다',
  'instrument.refused.rate': '천천히',
} satisfies Partial<Record<keyof typeof en, string>>;
