/** Spanish text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Misión',
  'quest.tab.jobChange': 'Clase',
  'quest.tab.castleTemple': 'Castillo/Templo',
  'quest.npc': 'NPC de misiones',
  'quest.whichQuest': '¿Qué misión quieres aceptar?',
  'quest.complete': 'Completar',
  'quest.completed': 'Misión completada',
  'quest.inProgress': 'Misión en curso',
  'quest.notStarted': 'Misión sin empezar',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Sin información del asedio',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Sin información del templo',
  'quest.proceed': 'Continuar la misión',
  'quest.giveUpConfirm': 'Si abandonas, no podrás continuar esta misión ni las relacionadas. ¿De verdad quieres abandonar?',
  'quest.waitingServer': 'Esperando al servidor...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Contribución: {value}',
  'quest.tracker.returnToNpc': 'Vuelve al NPC de la misión',
} satisfies Partial<Record<keyof typeof en, string>>;
