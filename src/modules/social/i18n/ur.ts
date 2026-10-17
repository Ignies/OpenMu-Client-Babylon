/** ur text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'آپ نے پارٹی چھوڑ دی۔',
  'party.onlyLeaderInvites': 'صرف پارٹی لیڈر دعوت دے سکتا ہے۔',
  'party.full': 'پارٹی بھری ہوئی ہے۔',
  'party.invitationSent': 'کھلاڑی {name} کو پارٹی کی دعوت بھیج دی گئی۔',
  'party.reply.on': 'پارٹی دعوتیں: آپ سے پوچھا جائے گا۔',
  'party.reply.off': 'پارٹی دعوتیں: خود بخود رد۔ دوبارہ پوچھے جانے کے لیے /re on۔',
  'party.reply.auto': 'پارٹی دعوتیں: خود بخود قبول۔ دوبارہ پوچھے جانے کے لیے /re on۔',
  'party.reply.status': 'پارٹی دعوتیں: /re {mode}۔ /re on، /re off یا /re auto استعمال کریں۔',
  'party.reply.declined': 'کھلاڑی {name} کی پارٹی دعوت رد کر دی گئی (/re)۔',
  'party.reply.accepted': 'کھلاڑی {name} کی پارٹی دعوت قبول کر لی گئی (/re)۔',
  'guild.joinRequestSent': 'کھلاڑی {name} کو گلڈ میں شمولیت کی درخواست بھیج دی گئی۔',
  'guild.onlyMasterAppoints': 'صرف گلڈ ماسٹر اراکین کو عہدے دے سکتا ہے۔',
  'guild.onlyMasterCan': 'یہ صرف گلڈ ماسٹر کر سکتا ہے۔',
  'guild.allianceRequestSent': 'کھلاڑی {name} کو اتحاد کی درخواست بھیج دی گئی۔',
  'guild.hostilityRequestSent': 'کھلاڑی {name} کو دشمنی کی درخواست بھیج دی گئی۔',
  'stats.added': 'تعداد {amount} پوائنٹس {stat} میں شامل کیے گئے۔',
  'stats.name.str': 'طاقت',
  'stats.name.agi': 'پھرتی',
  'stats.name.vit': 'صحت',
  'stats.name.ene': 'انرجی',
  'stats.name.cmd': 'قیادت',
} satisfies Partial<Record<keyof typeof en, string>>;
