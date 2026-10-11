import { defineWindow } from '@/controllers/interface/windows';
import { ChatWindow } from '.';

export default defineWindow({ id: 'chat', slot: 'hud', order: 230, component: ChatWindow });
