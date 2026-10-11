/** Chinese text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': '宠物',
  'petInfo.darkHorse': '暗黑战马',
  'petInfo.darkRaven': '暗黑乌鸦',
  'petInfo.notEquipped': '尚未装备{pet}。',
  'petInfo.waiting': '正在等待宠物信息...',
  'petInfo.level': '等级 {level}',
  'petInfo.life': '生命 {current} / {max}',
  'petInfo.exp': '经验 {current} / {next}',
  'petInfo.damage': '伤害 {min}~{max}（几率 {rate}）',
  'petInfo.attackSpeed': '攻击速度 {speed}',
  'petInfo.defense': '防御 {defense}',
  'petInfo.command': '命令',
  'petInfo.cmdNormal': '普通攻击',
  'petInfo.cmdRandom': '随机攻击',
  'petInfo.cmdOwner': '随主人攻击',
  'petInfo.cmdTarget': '攻击指定目标',
} satisfies Partial<Record<keyof typeof en, string>>;
