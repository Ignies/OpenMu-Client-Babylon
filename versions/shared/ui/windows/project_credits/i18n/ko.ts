/** Korean text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': '크레딧',
  'projectCredits.thanks': '특별히 감사드립니다',
  'projectCredits.thanksNote': '이 클라이언트의 바탕이 된 프로젝트와 사람들.',
  'projectCredits.contributors': '기여자',
  'projectCredits.playtesters': '테스트 플레이',
  'projectCredits.reporters': '버그 제보',
  'projectCredits.everyoneHeading': '그리고',
  'projectCredits.everyone': '기여해 주신 모든 분',
  'projectCredits.commits': '커밋 {count}',
  'projectCredits.reports': '제보 {count}',
  'projectCredits.owners': 'MU Online, 원본 클라이언트와 게임 데이터: Webzen.',
  'projectCredits.season6': 'Season 6 원본 크레딧은 서버 목록의 Credit 버튼입니다.',
  'projectCredits.loading': '크레딧을 불러오는 중...',
} satisfies Partial<Record<keyof typeof en, string>>;
