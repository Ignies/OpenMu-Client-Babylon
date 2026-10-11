import { defineWindow } from '@/controllers/interface/windows';
import { MatchTime } from '.';

export default defineWindow({ id: 'match_time', module: 'guild_war', slot: 'hud', order: 425, component: MatchTime });
