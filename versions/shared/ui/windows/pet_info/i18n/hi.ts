/** hi text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'पालतू',
  'petInfo.darkHorse': 'काला घोड़ा',
  'petInfo.darkRaven': 'काला कौवा',
  'petInfo.notEquipped': 'पालतू {pet} पहना हुआ नहीं है।',
  'petInfo.waiting': 'पालतू की जानकारी का इंतज़ार...',
  'petInfo.level': 'लेवल {level}',
  'petInfo.life': 'जीवन {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'नुकसान {min}~{max} (दर {rate})',
  'petInfo.attackSpeed': 'हमले की गति {speed}',
  'petInfo.defense': 'रक्षा {defense}',
  'petInfo.command': 'आदेश',
  'petInfo.cmdNormal': 'सामान्य हमला',
  'petInfo.cmdRandom': 'रैंडम हमला',
  'petInfo.cmdOwner': 'मालिक के साथ हमला',
  'petInfo.cmdTarget': 'लक्ष्य पर हमला',
} satisfies Partial<Record<keyof typeof en, string>>;
