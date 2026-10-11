import { defineWindow } from '@/controllers/interface/windows';
import { SoccerScoreHud } from '.';

export default defineWindow({ id: 'soccer_score', module: 'guild_war', slot: 'hud', order: 420, component: SoccerScoreHud });
