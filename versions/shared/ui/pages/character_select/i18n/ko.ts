/** Korean text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': '캐릭터를 불러오는 중...',
  'characters.select': '캐릭터를 선택하세요',
  'characters.hint.select': '선택',
  'characters.hint.zoomIn': '확대',
  'characters.hint.zoomOut': '축소',
  'class.desc.darkWizard':
    '마법사의 왕국, 아르카의 후예. 신체 조건은 약하지만 막대한 힘을 지녔고 공격 마법을 자유자재로 다룬다.',
  'class.desc.darkKnight':
    '기사의 왕국, 로렌시아의 후예. 강한 힘과 검술로 대부분의 근접 무기를 다룰 수 있다.',
  'class.desc.elf':
    '엘프의 왕국, 노리아의 후예. 활과 화살의 명수이며 여러 마법도 사용한다.',
  'class.desc.summoner':
    '강한 정신력과 뛰어난 통찰이 가장 강력한 저주 마법을 만든다. 다른 세계의 소환술사를 불러내어 해로운 주술로 맞선다.',
  'class.desc.rageFighter':
    '카르탄 왕립 기사단의 정통 후계자이자 뛰어난 체력을 지닌 무술가. 보조 축복으로 파티원도 돕는다.',
  'class.desc.magicGladiator':
    '다크 나이트와 다크 위저드의 특성을 함께 지닌 복합 직업. 근접전에 능하며 마법도 자유롭게 쓴다.',
  'class.desc.darkLord':
    '군대를 지휘하고 다크 스피릿과 다크 호스를 다루는 카리스마 있는 캐릭터.',
} satisfies Partial<Record<keyof typeof en, string>>;
