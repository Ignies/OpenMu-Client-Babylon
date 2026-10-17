/** Portuguese text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Baixando dados do jogo',
  'autoDownload.done': 'Dados do jogo baixados',
  'autoDownload.cancel': 'Cancelar',
  'autoDownload.hide': 'Ocultar (continua baixando)',
  'autoDownload.phase.map': 'Carregando mapa: {name}',
  'autoDownload.phase.icons': 'Carregando itens',
  'autoDownload.phase.audio': 'Carregando música e sons',
  'autoDownload.phase.monsters': 'Carregando personagens e criaturas',
  'autoDownload.phase.core': 'Carregando interface e efeitos',
  'autoDownload.left': 'Faltam {left} MB',
  'autoDownload.received': '{got} MB baixados de {total} MB',
  'autoDownload.screenTitle': 'Preparando sua aventura',
  'autoDownload.screenText': 'Estes arquivos ficam guardados para que a próxima partida carregue mais rápido. Só na primeira vez.',
  'autoDownload.skip': 'Entrar mesmo assim',
  'autoDownload.skipNote': 'O download continua em segundo plano. Se fechar o jogo, ele retoma de onde parou.',
} satisfies Partial<Record<keyof typeof en, string>>;
