import { defineWindow } from '@/controllers/interface/windows';
import { SessionStatsWindow } from '.';

export default defineWindow({ id: 'session_stats', slot: 'hud', order: 440, component: SessionStatsWindow });
