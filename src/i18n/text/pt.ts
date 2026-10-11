/** Portuguese text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Cancelar',
  'common.close': 'Fechar',
  'common.none': 'Nenhuma',
  'common.create': 'Criar',
  'common.creating': 'Criando...',
  'common.send': 'Enviar',
  'common.sending': 'Enviando...',
  'common.loading': 'Carregando...',
  'common.warning': 'Atenção',
  'common.level': 'Nível',
  'common.offline': 'Offline',
  'common.off': 'Não',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen insuficiente',
  'options.quality.classic': 'Clássica',
  'options.quality.enhanced': 'Melhorada',
} satisfies Partial<Record<keyof typeof en, string>>;
