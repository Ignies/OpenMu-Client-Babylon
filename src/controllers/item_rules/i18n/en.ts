/** English text of the `item_rules` controller. See src/i18n/readme.md. */

const en = {
  'options.compare.shift': 'Hold Shift',
  'options.compare.always': 'Always',
  'item.ringOfGlory': 'Ring of Glory',
  'item.darkStone': 'Dark Stone',
  'item.starOfSacredBirth': 'Star of Sacred Birth',
  'item.firecracker': 'Firecracker',
  'item.heartOfLove': 'Heart of Love',
  'item.silverMedal': 'Silver Medal',
  'item.goldMedal': 'Gold Medal',
  'item.boxOfHeaven': 'Box of Heaven',
  'item.boxOfKundun': 'Box of Kundun',
  'item.heartOfDarkLord': 'Heart of Dark Lord',
  'item.blueLuckyPouch': 'Blue Lucky Pouch',
  'item.redLuckyPouch': 'Red Lucky Pouch',
  'item.absoluteStaffOfArchangel': 'Absolute Staff of Archangel',
  'item.absoluteSwordOfArchangel': 'Absolute Sword of Archangel',
  'item.absoluteCrossbowOfArchangel': 'Absolute Crossbow of Archangel',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/item_rules': typeof en;
  }
}
