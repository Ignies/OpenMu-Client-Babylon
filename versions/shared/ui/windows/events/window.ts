import { defineWindow } from '@/controllers/interface/windows';
import { EventWindows } from '.';

export default defineWindow({ id: 'events', module: 'events', slot: 'hud', order: 400, component: EventWindows });
