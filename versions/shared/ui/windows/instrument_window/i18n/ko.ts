/** Korean text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': '악기',
  'instrument.load': 'MIDI 불러오기',
  'instrument.noFile': '불러온 파일 없음',
  'instrument.loading': '악기 불러오는 중...',
  'instrument.play': '재생',
  'instrument.pause': '일시정지',
  'instrument.stop': '정지',
  'instrument.loop': '반복',
  'instrument.channels': '채널',
  'instrument.band': '밴드',
  'instrument.join': '참여',
  'instrument.leave': '나가기',
  'instrument.nearby': '근처 연주자',
  'instrument.none': '근처에 연주하는 사람이 없습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
