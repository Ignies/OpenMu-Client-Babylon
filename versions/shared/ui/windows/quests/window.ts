import { defineWindow } from '@/controllers/interface/windows';
import { QuestWindows, QuestTracker } from '.';

export default [
  defineWindow({ id: 'quests', slot: 'hud', order: 300, component: QuestWindows }),
  defineWindow({ id: 'quest_tracker', slot: 'hud', order: 460, component: QuestTracker }),
];
