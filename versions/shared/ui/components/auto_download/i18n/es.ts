/** Spanish text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Descargando datos del juego',
  'autoDownload.done': 'Datos del juego descargados',
  'autoDownload.cancel': 'Cancelar',
  'autoDownload.hide': 'Ocultar (sigue descargando)',
  'autoDownload.phase.map': 'Cargando mapa: {name}',
  'autoDownload.phase.icons': 'Cargando objetos',
  'autoDownload.phase.audio': 'Cargando música y sonidos',
  'autoDownload.phase.monsters': 'Cargando personajes y criaturas',
  'autoDownload.phase.core': 'Cargando interfaz y efectos',
  'autoDownload.left': 'Faltan {left} MB',
  'autoDownload.received': '{got} MB descargados de {total} MB',
  'autoDownload.screenTitle': 'Preparando tu aventura',
  'autoDownload.screenText': 'Estos archivos se guardan para que tu próxima partida cargue más rápido. Solo la primera vez.',
  'autoDownload.skip': 'Entrar igual',
  'autoDownload.skipNote': 'La descarga sigue en segundo plano. Si cierras el juego, continúa donde quedó.',
} satisfies Partial<Record<keyof typeof en, string>>;
