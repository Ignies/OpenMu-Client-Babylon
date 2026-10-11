/** Korean text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': '펫',
  'petInfo.darkHorse': '다크 호스',
  'petInfo.darkRaven': '다크 레이븐',
  'petInfo.notEquipped': '{pet}을(를) 장착하지 않았습니다.',
  'petInfo.waiting': '펫 정보를 기다리는 중...',
  'petInfo.level': '레벨 {level}',
  'petInfo.life': '생명력 {current} / {max}',
  'petInfo.exp': '경험치 {current} / {next}',
  'petInfo.damage': '공격력 {min}~{max} (확률 {rate})',
  'petInfo.attackSpeed': '공격 속도 {speed}',
  'petInfo.defense': '방어력 {defense}',
  'petInfo.command': '명령',
  'petInfo.cmdNormal': '기본 공격',
  'petInfo.cmdRandom': '무작위 공격',
  'petInfo.cmdOwner': '주인과 함께 공격',
  'petInfo.cmdTarget': '지정한 대상 공격',
} satisfies Partial<Record<keyof typeof en, string>>;
