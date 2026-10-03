/** Portuguese text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Carregando a lista de servidores...',
  'servers.serverName': 'Servidor {number}',
  'login.id': 'ID',
  'login.password': 'Senha',

  'options.title': 'Opções',
  'options.texturePack': 'Texturas dos modelos',
  'options.texturePack.original': 'Originais',
  'options.texturePackHint': 'Texturas de modelos em alta resolução, aplicadas sem recarregar',
  'session.toLevel': 'Até o nível',
  'bottomBar.pet.normalTip': 'Normal: o corvo fica com você',
  'bottomBar.pet.randomTip': 'Aleatório: ataca o que estiver por perto',
  'bottomBar.pet.ownerTip': 'Dono: ataca o que você atacar',
  'bottomBar.pet.targetTip': 'Alvo: ataca seu alvo atual',

  'skills.title': 'Habilidades',
  'skills.empty': 'Nenhuma habilidade aprendida',
  'chatRoom.leave': 'Sair',
  'command.trade': 'Trocar',
  'command.purchase': 'Comprar',
  'command.party': 'Grupo',
  'command.whisper': 'Sussurrar',
  'command.follow': 'Seguir',
  'command.battle': 'Batalha',
  'warp.title': 'Janela de teleporte',
  'instrument.putAway': 'Guardar',
  'prompt.trade': 'Troca',
} satisfies Partial<Record<keyof typeof en, string>>;
