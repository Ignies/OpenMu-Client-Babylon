import { defineWindow } from '@/controllers/interface/windows';
import { TargetHealthBar } from '.';

export default defineWindow({ id: 'target_health_bar', slot: 'hud', order: 10, component: TargetHealthBar });
