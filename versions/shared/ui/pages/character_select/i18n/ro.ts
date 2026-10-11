/** Romanian text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Se încarcă personajele...',
  'characters.select': 'Alege un personaj',
  'characters.hint.select': 'Selectează',
  'characters.hint.zoomIn': 'Apropie',
  'characters.hint.zoomOut': 'Depărtează',
  'class.desc.darkWizard':
    'Regatul magilor, urmaș al lui Arka. Are o condiție fizică slabă, dar o putere uriașă și mânuiește liber vrăjile de atac.',
  'class.desc.darkKnight':
    'Regatul cavalerilor, urmaș al Lorenciei. Cu forță și măiestrie la sabie, poate folosi aproape orice armă de corp la corp.',
  'class.desc.elf':
    'Regatul elfilor, urmaș al Noriei. Maestru al arcului și săgeților, stăpânește și diferite vrăji.',
  'class.desc.summoner':
    'Mintea puternică și intuiția excelentă dau cea mai puternică vrajă de blestem. Cheamă totodată invocatori din altă lume și își folosește vrăjitoria împotriva lor.',
  'class.desc.rageFighter':
    'Moștenitori de drept ai Cavalerilor Regali din Karutan și maeștri în arte marțiale, cu o forță fizică remarcabilă. Ajută grupul și cu binecuvântări de sprijin.',
  'class.desc.magicGladiator':
    'Personaj mixt, cu trăsături de Dark Knight și Dark Wizard. Maestru al luptei corp la corp, care aruncă vrăji cu ușurință.',
  'class.desc.darkLord':
    'Personaj carismatic, care comandă trupe și stăpânește spiritul întunecat și calul întunecat.',
} satisfies Partial<Record<keyof typeof en, string>>;
