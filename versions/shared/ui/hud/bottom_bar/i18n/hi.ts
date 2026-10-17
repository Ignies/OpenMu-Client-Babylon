/** hi text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'आइटम शॉप',
  'bottomBar.characterInfo': 'किरदार की जानकारी',
  'bottomBar.inventory': 'इन्वेंटरी',
  'bottomBar.friendList': 'दोस्तों की सूची',
  'bottomBar.noSkill': 'कोई स्किल नहीं (राइट क्लिक = हमला)',
  'bottomBar.emptySlot': '[{key}] खाली',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - क्लिक: स्किल सूची, राइट क्लिक: सादा हमला',
  'bottomBar.pickSkill': '[{key}] खाली - स्किल चुनने के लिए क्लिक करें',
  'bottomBar.boundSlot': '{name} [{key}] - बदलने के लिए राइट क्लिक करें',
  'bottomBar.clearSlot': 'स्लॉट [{key}] खाली छोड़ें',
  'bottomBar.pet.normal': 'सामान्य',
  'bottomBar.pet.random': 'रैंडम',
  'bottomBar.pet.owner': 'मालिक',
  'bottomBar.pet.target': 'लक्ष्य',
  'bottomBar.pet.needTarget': 'पहले कौवे के लिए एक लक्ष्य चुनें',
  'exp.title': 'अनुभव',
  'bottomBar.menu': 'मेनू',
} satisfies Partial<Record<keyof typeof en, string>>;
