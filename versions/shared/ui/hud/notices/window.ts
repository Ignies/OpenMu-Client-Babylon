import { defineWindow } from '@/controllers/interface/windows';
import { Notices } from '.';

export default defineWindow({ id: 'notices', slot: 'hud', order: 40, component: Notices });
