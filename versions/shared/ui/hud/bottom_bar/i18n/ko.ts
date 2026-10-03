/** Korean text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': '아이템 상점',
  'bottomBar.characterInfo': '캐릭터 정보',
  'bottomBar.inventory': '인벤토리',
  'bottomBar.friendList': '친구 목록',
  'bottomBar.options': '옵션',
  'bottomBar.noSkill': '스킬 없음(오른쪽 클릭 = 공격)',
  'bottomBar.emptySlot': '[{key}] 비어 있음',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - 클릭: 스킬 목록, 오른쪽 클릭: 일반 공격',
  'bottomBar.pickSkill': '[{key}] 비어 있음 - 클릭해 스킬을 고르세요',
  'bottomBar.boundSlot': '{name} [{key}] - 오른쪽 클릭으로 변경',
  'bottomBar.clearSlot': '[{key}] 칸을 비우기',
  'bottomBar.pet.normal': '기본',
  'bottomBar.pet.random': '무작위',
  'bottomBar.pet.owner': '주인',
  'bottomBar.pet.target': '대상',
  'bottomBar.pet.needTarget': '먼저 까마귀의 대상을 지정하세요',
  'exp.title': '경험치',
} satisfies Partial<Record<keyof typeof en, string>>;
