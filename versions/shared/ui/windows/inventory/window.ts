import { defineWindow } from '@/controllers/interface/windows';
import { Inventory } from '.';

export default defineWindow({ id: 'inventory', slot: 'hud', order: 80, component: Inventory });
