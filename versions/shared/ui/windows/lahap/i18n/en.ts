/** English text of the `lahap` window. See src/i18n/readme.md. */

const en = {
  'lahap.combineTitle': 'Jewel combination',
  'lahap.dismantleTitle': 'Dismantle jewel',
  'lahap.menu1': 'You can combine or dissolve',
  'lahap.menu2': 'various jewels.',
  'lahap.close': 'Close',
  'lahap.selectCombine': 'Select a jewel to combine.',
  'lahap.combineCount': 'Combine {count} ({zen} zen is required)',
  'lahap.cost': 'Combination cost: {zen} zen',
  'lahap.selectDismantle': 'Select a jewel to dissolve.',
  'lahap.disband': 'Disband',
  'lahap.disbandSure': 'Are you sure to disband {name} {level}?',
  'lahap.dismantleCost': 'Dissolving cost: {zen} zen',
  'lahap.jewel.0': 'Jewel of Bless',
  'lahap.jewel.1': 'Jewel of Soul',
  'lahap.jewel.2': 'Jewel of Life',
  'lahap.jewel.3': 'Jewel of Creation',
  'lahap.jewel.4': 'Jewel of Guardian',
  'lahap.jewel.5': 'Jewel stone',
  'lahap.jewel.6': 'Jewel of Harmony',
  'lahap.jewel.7': 'Jewel of Chaos',
  'lahap.jewel.8': 'Lower Refining Stone',
  'lahap.jewel.9': 'Higher Refining Stone',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/lahap': typeof en;
  }
}
