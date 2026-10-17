/** ur text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'سرور فہرست لوڈ ہو رہی ہے...',
  'servers.serverName': 'سرور {number}',
  'login.id': 'ID',
  'login.password': 'پاس ورڈ',
  'options.title': 'ترتیبات',
  'options.texturePack': 'ماڈل ٹیکسچرز',
  'options.texturePack.original': 'اصل',
  'options.texturePackHint': 'زیادہ ریزولوشن والے ماڈل ٹیکسچرز، دوبارہ لوڈ کیے بغیر لاگو',
  'session.toLevel': 'اگلے لیول تک',
  'bottomBar.pet.normalTip': 'عام: کوا آپ کے ساتھ رہتا ہے',
  'bottomBar.pet.randomTip': 'بے ترتیب: قریب کی ہر چیز پر حملہ کرتا ہے',
  'bottomBar.pet.ownerTip': 'مالک: جس پر آپ حملہ کریں اسی پر حملہ کرتا ہے',
  'bottomBar.pet.targetTip': 'ہدف: آپ کے موجودہ ہدف پر حملہ کرتا ہے',
  'skills.title': 'سکلز',
  'skills.empty': 'کوئی سکل نہیں سیکھی',
  'chatRoom.leave': 'چھوڑیں',
  'command.trade': 'تجارت',
  'command.purchase': 'خریداری',
  'command.party': 'پارٹی',
  'command.whisper': 'سرگوشی',
  'command.follow': 'پیچھا کریں',
  'command.battle': 'مقابلہ',
  'warp.title': 'سفر کمانڈ ونڈو',
  'instrument.putAway': 'رکھ دیں',
  'prompt.trade': 'تجارت',
} satisfies Partial<Record<keyof typeof en, string>>;
