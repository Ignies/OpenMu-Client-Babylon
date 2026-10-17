/** zh-Hant text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': '正在載入伺服器列表……',
  'servers.serverName': '伺服器{number}',
  'login.id': '帳號',
  'login.password': '密碼',
  'options.title': '設定',
  'options.texturePack': '模型材質',
  'options.texturePack.original': '原版',
  'options.texturePackHint': '更高解析度的模型材質，不需重新載入即可套用',
  'session.toLevel': '距離升級',
  'bottomBar.pet.normalTip': '普通：天鷹留在你身邊',
  'bottomBar.pet.randomTip': '隨機：攻擊附近的任何目標',
  'bottomBar.pet.ownerTip': '主人：攻擊你所攻擊的目標',
  'bottomBar.pet.targetTip': '目標：攻擊你目前的目標',
  'skills.title': '技能',
  'skills.empty': '尚未學會任何技能',
  'chatRoom.leave': '離開',
  'command.trade': '交易',
  'command.purchase': '購買',
  'command.party': '組隊',
  'command.whisper': '密語',
  'command.follow': '跟隨',
  'command.battle': '決鬥',
  'warp.title': '傳送指令視窗',
  'instrument.putAway': '收起',
  'prompt.trade': '交易',
} satisfies Partial<Record<keyof typeof en, string>>;
