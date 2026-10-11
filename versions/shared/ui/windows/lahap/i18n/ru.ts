/** Russian text of the `lahap` window. */

import type en from './en';

export default {
  'lahap.combineTitle': 'Объединение камней',
  'lahap.dismantleTitle': 'Разделение камней',
  'lahap.menu1': 'Здесь можно объединить или разделить',
  'lahap.menu2': 'различные камни.',
  'lahap.close': 'Закрыть',
  'lahap.selectCombine': 'Выберите камень для объединения.',
  'lahap.combineCount': 'Объединить {count} (нужно {zen} зен)',
  'lahap.cost': 'Стоимость объединения: {zen} зен',
  'lahap.selectDismantle': 'Выберите камень для разделения.',
  'lahap.disband': 'Разделить',
  'lahap.disbandSure': 'Разделить {name} {level}?',
  'lahap.dismantleCost': 'Стоимость разделения: {zen} зен',
  'lahap.jewel.0': 'Камень благословения',
  'lahap.jewel.1': 'Камень души',
  'lahap.jewel.2': 'Камень жизни',
  'lahap.jewel.3': 'Камень созидания',
  'lahap.jewel.4': 'Камень стража',
  'lahap.jewel.5': 'Самоцвет',
  'lahap.jewel.6': 'Камень гармонии',
  'lahap.jewel.7': 'Камень хаоса',
  'lahap.jewel.8': 'Низший камень очищения',
  'lahap.jewel.9': 'Высший камень очищения',
} satisfies Partial<Record<keyof typeof en, string>>;
