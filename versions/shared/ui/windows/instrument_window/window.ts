import { defineWindow } from '@/controllers/interface/windows';
import { InstrumentWindow } from '.';

export default defineWindow({ id: 'instrument', slot: 'hud', order: 220, component: InstrumentWindow });
