/** Portuguese text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Missão',
  'quest.tab.jobChange': 'Classe',
  'quest.tab.castleTemple': 'Castelo/Templo',
  'quest.npc': 'NPC de missões',
  'quest.whichQuest': 'Qual missão você quer aceitar?',
  'quest.complete': 'Concluir',
  'quest.completed': 'Missão concluída',
  'quest.inProgress': 'Missão em andamento',
  'quest.notStarted': 'Missão não iniciada',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Sem informações do cerco',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Sem informações do templo',
  'quest.proceed': 'Prosseguir com a missão',
  'quest.giveUpConfirm': 'Se você desistir, não poderá continuar esta missão nem as missões relacionadas. Deseja mesmo desistir?',
  'quest.waitingServer': 'Aguardando o servidor...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Contribuição: {value}',
  'quest.tracker.returnToNpc': 'Volte ao NPC da missão',
} satisfies Partial<Record<keyof typeof en, string>>;
