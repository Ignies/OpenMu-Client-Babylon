import { defineWindow } from '@/controllers/interface/windows';
import { TradeWindow } from '.';

export default defineWindow({ id: 'trade', module: 'trade', slot: 'hud', order: 120, component: TradeWindow });
