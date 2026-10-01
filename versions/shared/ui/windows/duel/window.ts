import { defineWindow } from '@/controllers/interface/windows';
import { DuelWindows } from '.';

export default defineWindow({ id: 'duel', slot: 'hud', order: 430, component: DuelWindows });
