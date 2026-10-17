/** fil text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'Umalis si {name} sa guild.',
  'guild.youLeft': 'Umalis ka na sa guild.',
  'guild.disbanded': 'Binuwag ang guild.',
  'guild.memberRemoved': 'Inalis ang miyembro sa guild.',
  'guild.onlyMasterRemoves': 'Ang guild master lamang ang makapag-aalis ng mga miyembro.',
  'guild.wrongPassword': 'Mali ang password na inilagay mo.',
  'guild.created': 'Nagawa na ang guild.',
  'guild.nameTaken': 'May gumagamit na ng pangalang iyan ng guild.',
  'guild.createFailed': 'Hindi magawa ang guild.',
  'guild.joinRefused': 'Tinanggihan ng guild master ang iyong kahilingan.',
  'guild.joined': 'Sumali ka na sa guild.',
  'guild.isFull': 'Puno na ang guild.',
  'guild.masterUnavailable': 'Hindi available ang guild master.',
  'guild.masterBusy': 'Abala ang guild master. Subukan muli mamaya.',
  'guild.needLevel6': 'Kailangan mong level 6 man lang para sumali sa guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
