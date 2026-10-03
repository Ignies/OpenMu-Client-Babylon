/** Italian text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Caricamento dei personaggi...',
  'characters.select': 'Scegli un personaggio',
  'characters.hint.select': 'Seleziona',
  'characters.hint.zoomIn': 'Avvicina',
  'characters.hint.zoomOut': 'Allontana',
  'class.desc.darkWizard':
    'Regno dei maghi, discendente di Arka. Ha una costituzione fisica scarsa ma un potere enorme, e usa liberamente gli incantesimi d’attacco.',
  'class.desc.darkKnight':
    'Regno dei cavalieri, discendente di Lorencia. Con grande forza e maestria di spada può usare quasi tutte le armi da mischia.',
  'class.desc.elf':
    'Regno degli elfi, discendente di Noria. Maestro di arco e frecce, sa anche lanciare vari incantesimi.',
  'class.desc.summoner':
    'Una mente forte e un’intuizione eccellente creano l’incantesimo di maledizione più potente. Richiama inoltre evocatori di un altro mondo e volge contro di loro la propria stregoneria.',
  'class.desc.rageFighter':
    'Eredi legittimi dei Cavalieri Reali di Karutan e maestri di arti marziali di grande forza fisica. Aiutano anche il gruppo con benedizioni di supporto.',
  'class.desc.magicGladiator':
    'Personaggio misto con tratti del Dark Knight e del Dark Wizard. Maestro del corpo a corpo, lancia incantesimi con disinvoltura.',
  'class.desc.darkLord':
    'Personaggio carismatico che comanda le truppe e domina lo spirito oscuro e il cavallo oscuro.',
} satisfies Partial<Record<keyof typeof en, string>>;
