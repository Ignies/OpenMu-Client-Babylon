/** English text of the `character_select` page. See src/i18n/readme.md. */

const en = {
  'characters.loading': 'Loading characters...',
  'characters.select': 'Select a character',
  'characters.hint.select': 'Select',
  'characters.hint.zoomIn': 'Zoom in',
  'characters.hint.zoomOut': 'Zoom out',

  // The blurb under each class on the creation screen (GlobalText 1705…).
  'class.desc.darkWizard':
    'Kingdom of wizards, descendant of Arka. He has a inferior physical condition but has a enormous power and can command attacking spells freely.',
  'class.desc.darkKnight':
    'Kingdom of knights, descendant of Lorencia.With a powerful strength and swordsmanship he can handle most of the close-range weapons.',
  'class.desc.elf':
    'Kingdom of elves, descendants of Noria. A master of arrows and bows and commands various spells.',
  'class.desc.summoner':
    'Strong mentality and excellent insight creates the most powerful curse spell. Also this item pulls out another world summoners and use the detrimental sorcery against them.',
  'class.desc.rageFighter':
    'Legitimate bearers of the Karutan Royal Knights and martial artists of great physical strength. They also help other party memgers by casting subsidiary buffs.',
  'class.desc.magicGladiator':
    'Complex character that has a characteristics of the Dark knight and Dark wizard. Master in a close-range combat and can command spells freely.',
  'class.desc.darkLord':
    'Charismatic character that can command the troops and handle the Dark spirit and Dark horse.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/pages/character_select': typeof en;
  }
}
