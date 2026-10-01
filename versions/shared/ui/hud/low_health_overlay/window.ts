import { defineWindow } from '@/controllers/interface/windows';
import { LowHealthOverlay } from '.';

export default defineWindow({ id: 'low_health_overlay', slot: 'world', order: 10, component: LowHealthOverlay });
