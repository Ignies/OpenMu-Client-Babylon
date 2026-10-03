/** Chinese text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': '正在加载角色...',
  'characters.select': '请选择角色',
  'characters.hint.select': '选择',
  'characters.hint.zoomIn': '拉近',
  'characters.hint.zoomOut': '拉远',
  'class.desc.darkWizard':
    '魔法师之国，阿卡的后裔。体质较弱，但拥有巨大的力量，能自如地驾驭攻击魔法。',
  'class.desc.darkKnight':
    '骑士之国，勒仁西亚的后裔。凭借强大的力量与剑术，可以使用大多数近战武器。',
  'class.desc.elf':
    '精灵之国，诺利亚的后裔。精通弓箭，同时也能施展多种魔法。',
  'class.desc.summoner':
    '坚强的意志与出色的洞察力造就了最强的诅咒魔法。她还能召唤异界的召唤师，并以有害的巫术对付他们。',
  'class.desc.rageFighter':
    '卡鲁坦皇家骑士的正统传人，拥有强大体魄的格斗家。他们还能为队友施加辅助祝福。',
  'class.desc.magicGladiator':
    '兼具骑士与魔法师特点的复合职业。精通近身格斗，也能自如地施展魔法。',
  'class.desc.darkLord':
    '富有魅力的角色，能够指挥部队并驾驭黑暗精灵与黑马。',
} satisfies Partial<Record<keyof typeof en, string>>;
