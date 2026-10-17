/** zh-Hant text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': '寵物',
  'petInfo.darkHorse': '黑王馬',
  'petInfo.darkRaven': '天鷹',
  'petInfo.notEquipped': '尚未裝備{pet}。',
  'petInfo.waiting': '正在等待寵物資訊……',
  'petInfo.level': '等級{level}',
  'petInfo.life': '生命值 {current} / {max}',
  'petInfo.exp': '經驗值 {current} / {next}',
  'petInfo.damage': '攻擊力 {min}~{max}（成功率{rate}）',
  'petInfo.attackSpeed': '攻擊速度{speed}',
  'petInfo.defense': '防禦力{defense}',
  'petInfo.command': '指令',
  'petInfo.cmdNormal': '預設攻擊',
  'petInfo.cmdRandom': '隨機攻擊',
  'petInfo.cmdOwner': '與主人一起攻擊',
  'petInfo.cmdTarget': '攻擊目標',
} satisfies Partial<Record<keyof typeof en, string>>;
