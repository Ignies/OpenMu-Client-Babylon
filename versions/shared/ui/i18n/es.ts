/** Spanish text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Cargando la lista de servidores...',
  'servers.serverName': 'Servidor {number}',
  'login.id': 'ID',
  'login.password': 'Contraseña',

  'options.title': 'Opciones',
  'options.texturePack': 'Texturas de modelos',
  'options.texturePack.original': 'Originales',
  'options.texturePackHint': 'Texturas de modelos en alta resolución, aplicadas sin recargar',
  'session.toLevel': 'Al nivel',
  'bottomBar.pet.normalTip': 'Normal: el cuervo se queda contigo',
  'bottomBar.pet.randomTip': 'Al azar: ataca a lo que tenga cerca',
  'bottomBar.pet.ownerTip': 'Amo: ataca a lo que tú atacas',
  'bottomBar.pet.targetTip': 'Objetivo: ataca a tu objetivo actual',

  'skills.title': 'Habilidades',
  'skills.empty': 'No has aprendido ninguna habilidad',
  'chatRoom.leave': 'Salir',
  'command.trade': 'Intercambiar',
  'command.purchase': 'Comprar',
  'command.party': 'Grupo',
  'command.whisper': 'Susurrar',
  'command.follow': 'Seguir',
  'command.battle': 'Combate',
  'warp.title': 'Ventana de teletransporte',
  'instrument.putAway': 'Guardar',
  'prompt.trade': 'Intercambio',
} satisfies Partial<Record<keyof typeof en, string>>;
