import { defineWindow } from '@/controllers/interface/windows';
import { WorldObjects } from '.';

export default defineWindow({ id: 'world_objects', slot: 'world', order: 20, component: WorldObjects });
