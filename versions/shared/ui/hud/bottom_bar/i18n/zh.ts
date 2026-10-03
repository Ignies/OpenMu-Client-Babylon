/** Chinese text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': '商城',
  'bottomBar.characterInfo': '角色信息',
  'bottomBar.inventory': '背包',
  'bottomBar.friendList': '好友列表',
  'bottomBar.options': '选项',
  'bottomBar.noSkill': '无技能（右键＝普通攻击）',
  'bottomBar.emptySlot': '[{key}] 空',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - 左键：技能列表，右键：普通攻击',
  'bottomBar.pickSkill': '[{key}] 空 - 点击选择技能',
  'bottomBar.boundSlot': '{name} [{key}] - 右键更换',
  'bottomBar.clearSlot': '将 [{key}] 格留空',
  'bottomBar.pet.normal': '普通',
  'bottomBar.pet.random': '随机',
  'bottomBar.pet.owner': '主人',
  'bottomBar.pet.target': '目标',
  'bottomBar.pet.needTarget': '请先为乌鸦选择目标',
  'exp.title': '经验',
} satisfies Partial<Record<keyof typeof en, string>>;
