/** Spanish text of the `lahap` window. */

import type en from './en';

export default {
  'lahap.combineTitle': 'Combinación de joyas',
  'lahap.dismantleTitle': 'Desarmar joyas',
  'lahap.menu1': 'Aquí puedes combinar o desarmar',
  'lahap.menu2': 'diversas joyas.',
  'lahap.close': 'Cerrar',
  'lahap.selectCombine': 'Elige una joya para combinar.',
  'lahap.combineCount': 'Combinar {count} ({zen} zen necesarios)',
  'lahap.cost': 'Coste de la combinación: {zen} zen',
  'lahap.selectDismantle': 'Elige una joya para desarmar.',
  'lahap.disband': 'Desarmar',
  'lahap.disbandSure': '¿Seguro que quieres desarmar {name} {level}?',
  'lahap.dismantleCost': 'Coste del desarme: {zen} zen',
  'lahap.jewel.0': 'Joya de la Bendición',
  'lahap.jewel.1': 'Joya del Alma',
  'lahap.jewel.2': 'Joya de la Vida',
  'lahap.jewel.3': 'Joya de la Creación',
  'lahap.jewel.4': 'Joya del Guardián',
  'lahap.jewel.5': 'Piedra preciosa',
  'lahap.jewel.6': 'Joya de la Armonía',
  'lahap.jewel.7': 'Joya del Caos',
  'lahap.jewel.8': 'Piedra de refinado inferior',
  'lahap.jewel.9': 'Piedra de refinado superior',
} satisfies Partial<Record<keyof typeof en, string>>;
