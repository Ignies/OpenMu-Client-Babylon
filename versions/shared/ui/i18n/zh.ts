/** Chinese text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': '正在加载服务器列表...',
  'servers.serverName': '服务器 {number}',
  'login.id': '账号',
  'login.password': '密码',

  'options.title': '选项',
  'options.texturePack': '模型贴图',
  'options.texturePack.original': '原版',
  'options.texturePackHint': '更高分辨率的模型贴图，无需重新加载即可应用',
  'session.toLevel': '升级还需',
  'bottomBar.pet.normalTip': '普通：乌鸦跟随在你身边',
  'bottomBar.pet.randomTip': '随机：攻击附近的任何目标',
  'bottomBar.pet.ownerTip': '主人：攻击你所攻击的目标',
  'bottomBar.pet.targetTip': '目标：攻击你当前的目标',

  'skills.title': '技能',
  'skills.empty': '尚未学会技能',
  'chatRoom.leave': '离开',
  'command.trade': '交易',
  'command.purchase': '购买',
  'command.party': '队伍',
  'command.whisper': '密语',
  'command.follow': '跟随',
  'command.battle': '决斗',
  'warp.title': '传送指令窗口',
  'instrument.putAway': '收起',
  'prompt.trade': '交易',
} satisfies Partial<Record<keyof typeof en, string>>;
