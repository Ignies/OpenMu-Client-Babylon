/** Spanish text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'Aceptar',
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.none': 'Ninguna',
  'common.create': 'Crear',
  'common.creating': 'Creando...',
  'common.send': 'Enviar',
  'common.sending': 'Enviando...',
  'common.loading': 'Cargando...',
  'common.warning': 'Aviso',
  'common.level': 'Nivel',
  'common.offline': 'Desconectado',
  'common.off': 'No',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'No tienes suficiente Zen',
  'options.quality.classic': 'Clásica',
  'options.quality.enhanced': 'Mejorada',
} satisfies Partial<Record<keyof typeof en, string>>;
