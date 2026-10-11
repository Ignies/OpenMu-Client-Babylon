import { defineWindow } from '@/controllers/interface/windows';
import { InstrumentWindow } from '.';

export default defineWindow({ id: 'instrument', module: 'band', slot: 'hud', order: 220, component: InstrumentWindow });
