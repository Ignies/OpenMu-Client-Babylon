import { defineWindow } from '@/controllers/interface/windows';
import { CharacterInfo } from '.';

export default defineWindow({ id: 'character_info', slot: 'hud', order: 150, component: CharacterInfo });
