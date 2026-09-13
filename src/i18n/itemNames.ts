/**
 * Item names a shipped language pack gets wrong.
 *
 * `Data/Local/<pack>/item_<lang>.bmd` is Webzen's own table and it is what the
 * player reads, so a bad name there is on screen for good. The names below
 * replace single records of it, the way `packRepairs.ts` replaces single words
 * of the quest prose: data, keyed `"group/index"` exactly as `tools/packs/`
 * keys its own tables, read by `libs/mu/itemNameFile.ts` before the pack.
 *
 * Nothing else is touched - an item keeps its slot, its stats and the English
 * `ItemName` everything in the code still keys on.
 */

export type ItemNameFixes = Readonly<Record<string, string>>;

// ---- Spanish (`Data/Local/Spn`) --------------------------------------------

/**
 * The pack was translated in two passes and they disagree. The first one read
 * "scroll" as a roll of paper and wrote *Rollo*; the second, which did the
 * Season 3+ skills, wrote *Pergamino* - the word every Spanish-speaking server
 * and guide uses for a spell scroll. Everything is brought onto *Pergamino*.
 *
 * The rest is damage: names cut off by the 30-byte field, a handful of typos,
 * and a few records that disagree with the rest of their own set. The skill
 * halves of the scroll names are left exactly as `skill_spn.bmd` spells them,
 * because the tooltip prints that name one line below ("Enseña: Veneno").
 */
export const SPANISH_ITEM_NAMES: ItemNameFixes = {
  // --- scrolls: Rollo -> Pergamino --------------------------------------
  '12/21': 'Pergamino de Explosión de Fuego',
  '12/22': 'Pergamino de Invocación',
  '12/23': 'Pergamino de Daño Crítico',
  '12/24': 'Pergamino de Chispa Eléctrica',
  '12/35': 'Pergamino de Alarido de Fuego',
  '12/48': 'Pergamino de Diseier Caótico',
  '13/16': 'Pergamino de Arcángel',
  '13/49': 'Pergamino Antiguo',
  '13/51': 'Pergamino de Sangre',
  '13/103': 'Pergamino EXP de Participación',
  '14/10': 'Pergamino del Portal del Pueblo',
  '14/23': 'Pergamino del Emperador',
  '14/72': 'Pergamino de Rapidez',
  '14/73': 'Pergamino de Defensa',
  '14/74': 'Pergamino de Ira',
  '14/75': 'Pergamino de Magia',
  '14/76': 'Pergamino de Salud',
  '14/77': 'Pergamino de Maná',
  '14/97': 'Pergamino de Batalla',
  '14/98': 'Pergamino de Fuerza',
  '14/140': 'Pergamino de Curación',
  '15/0': 'Pergamino de Veneno',
  '15/1': 'Pergamino de Meteorito',
  '15/2': 'Pergamino de Relámpago',
  '15/3': 'Pergamino de Bola de Fuego',
  '15/4': 'Pergamino de Llama',
  '15/5': 'Pergamino de Telepuerto',
  '15/6': 'Pergamino de Hielo',
  '15/7': 'Pergamino de Tornado',
  '15/8': 'Pergamino de Espíritu Maligno',
  '15/9': 'Pergamino de Fuego Infernal',
  '15/10': 'Pergamino de Onda de Poder',
  '15/11': 'Pergamino de Columna de Agua',
  '15/12': 'Pergamino de Caída de Cometa',
  '15/13': 'Pergamino del Infierno',
  '15/14': 'Pergamino de Telepuerto Aliado',
  '15/15': 'Pergamino de Barrera de Almas',
  '15/16': 'Pergamino de Decadencia',
  '15/17': 'Pergamino de Tormenta de Hielo',
  '15/18': 'Pergamino de Nova',
  '15/28': 'Pergamino de Mejora de Magia',
  '15/29': 'Pergamino de Tormenta Gigantesca',

  // --- cut off by the 30-byte name field --------------------------------
  '0/34': 'Guantes de Cuchillas Perforadoras',
  '13/135': '1er Boleto Armadura de la Suerte',
  '13/136': '1er Boleto Pantalones de la Suerte',
  '13/138': '1er Boleto Guantes de la Suerte',
  '13/140': '2º Boleto Armadura de la Suerte',
  '13/141': '2º Boleto Pantalones de la Suerte',
  '14/163': 'Certificado de Expansión de Bóveda',
  '15/33': 'Pergamino Aniquilador de Dragón',

  // --- typos and wrong words --------------------------------------------
  '0/26': 'Flamberge',
  '2/18': 'Cetro Ariete',
  '12/9': 'Orbe de Mayor Defensa',
  '13/0': 'Ángel Guardián',
  '13/12': 'Pendiente de Relámpago',
  '14/102': 'Orden de Gaion',

  // --- one piece of a set spelled unlike the rest of it -----------------
  '4/23': 'Arco Punzón Oscuro',
  '5/9': 'Báculo Gran Alma',
  '6/17': 'Escudo Gloria Carmesí',
  '6/19': 'Escudo Barrera Congelada',
  '8/22': 'Armadura Alma Oscura',

  // --- lower case where every other name is capitalised -----------------
  '12/26': 'Gema del Secreto',
  '12/30': 'Fardo de Joyas de Bendición',
  '12/31': 'Fardo de Joyas de Alma',
  '12/32': 'Caja de Moño Rojo',
  '12/33': 'Caja de Moño Verde',
  '12/34': 'Caja de Moño Azul',
  '13/134': 'Herradura Usada',
  '14/153': 'Polvo Estelar',

  // --- blank in the pack, so the English name was showing ---------------
  '7/53': 'Yelmo de la Reina',
  '8/53': 'Armadura de la Reina',
  '9/53': 'Pantalones de la Reina',
  '10/53': 'Guantes de la Reina',
  '11/53': 'Botas de la Reina',
};
