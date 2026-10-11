import { defineWindow } from '@/controllers/interface/windows';
import { CameraReset } from '.';

export default defineWindow({ id: 'camera_reset', slot: 'hud', order: 455, component: CameraReset });
