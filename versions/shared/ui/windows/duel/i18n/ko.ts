/** Korean text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name}님이 결투를 신청했습니다.',
  'duel.wins': '{winner}님이 {loser}님과의 결투에서 이겼습니다.',
  'duel.watchTitle': '결투 현황',
  'duel.channel': '결투 채널 {number}',
  'duel.emptyChannel': '빈 채널',
  'duel.join': '관전',
  'duel.vs': 'VS',
  'duel.leaveWatch': '결투 채널에서 나가기',
  'duel.stop': '결투 종료',
} satisfies Partial<Record<keyof typeof en, string>>;
