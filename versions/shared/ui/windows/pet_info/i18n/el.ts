/** el text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Κατοικίδιο',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'Το κατοικίδιο {pet} δεν είναι σε χρήση.',
  'petInfo.waiting': 'Αναμονή για τις πληροφορίες του κατοικίδιου...',
  'petInfo.level': 'Επίπεδο {level}',
  'petInfo.life': 'Ζωή {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Ζημιά {min}~{max} (Ποσοστό {rate})',
  'petInfo.attackSpeed': 'Ταχύτητα επίθεσης {speed}',
  'petInfo.defense': 'Άμυνα {defense}',
  'petInfo.command': 'Εντολή',
  'petInfo.cmdNormal': 'Κανονική επίθεση',
  'petInfo.cmdRandom': 'Τυχαία επίθεση',
  'petInfo.cmdOwner': 'Επίθεση με τον κάτοχο',
  'petInfo.cmdTarget': 'Επίθεση στον στόχο',
} satisfies Partial<Record<keyof typeof en, string>>;
