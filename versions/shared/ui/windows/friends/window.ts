import { defineWindow } from '@/controllers/interface/windows';
import { FriendWindow } from '.';

export default defineWindow({ id: 'friends', slot: 'hud', order: 310, component: FriendWindow });
