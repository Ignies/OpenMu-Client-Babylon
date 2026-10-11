/** Portuguese text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'Carregando personagens...',
  'characters.select': 'Escolha um personagem',
  'characters.hint.select': 'Selecionar',
  'characters.hint.zoomIn': 'Aproximar',
  'characters.hint.zoomOut': 'Afastar',
  'class.desc.darkWizard':
    'Reino dos magos, descendente de Arka. Tem condição física fraca, mas um poder enorme, e usa livremente os feitiços de ataque.',
  'class.desc.darkKnight':
    'Reino dos cavaleiros, descendente de Lorencia. Com força e esgrima poderosas, maneja quase todas as armas corpo a corpo.',
  'class.desc.elf':
    'Reino dos elfos, descendente de Noria. Mestre do arco e flecha, também comanda diversos feitiços.',
  'class.desc.summoner':
    'Mente forte e ótima intuição criam o feitiço de maldição mais poderoso. Também atrai invocadores de outro mundo e usa contra eles sua feitiçaria nociva.',
  'class.desc.rageFighter':
    'Herdeiros legítimos dos Cavaleiros Reais de Karutan e artistas marciais de grande força física. Também ajudam o grupo com bênçãos de apoio.',
  'class.desc.magicGladiator':
    'Personagem misto, com traços do Dark Knight e do Dark Wizard. Mestre do combate corpo a corpo e capaz de lançar feitiços com facilidade.',
  'class.desc.darkLord':
    'Personagem carismático que comanda tropas e domina o espírito sombrio e o cavalo sombrio.',
} satisfies Partial<Record<keyof typeof en, string>>;
