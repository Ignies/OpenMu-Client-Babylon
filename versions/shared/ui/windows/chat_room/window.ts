import { defineWindow } from '@/controllers/interface/windows';
import { ChatRoomWindow } from '.';

export default defineWindow({ id: 'chat_room', slot: 'hud', order: 320, component: ChatRoomWindow });
