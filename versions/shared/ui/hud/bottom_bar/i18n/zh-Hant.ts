/** zh-Hant text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': '商城',
  'bottomBar.characterInfo': '角色資訊',
  'bottomBar.inventory': '背包',
  'bottomBar.friendList': '好友名單',
  'bottomBar.menu': '選單',
  'bottomBar.noSkill': '無技能（右鍵 = 攻擊）',
  'bottomBar.emptySlot': '[{key}] 空',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - 點擊：技能列表，右鍵：普通攻擊',
  'bottomBar.pickSkill': '[{key}] 空 - 點擊選擇技能',
  'bottomBar.boundSlot': '{name} [{key}] - 右鍵更換',
  'bottomBar.clearSlot': '將 [{key}] 欄位清空',
  'bottomBar.pet.normal': '普通',
  'bottomBar.pet.random': '隨機',
  'bottomBar.pet.owner': '主人',
  'bottomBar.pet.target': '目標',
  'bottomBar.pet.needTarget': '請先為天鷹選擇目標',
  'exp.title': '經驗值',
} satisfies Partial<Record<keyof typeof en, string>>;
