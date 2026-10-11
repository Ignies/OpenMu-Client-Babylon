import { defineWindow } from '@/controllers/interface/windows';
import { MapNameBanner } from '.';

export default defineWindow({ id: 'map_name_banner', slot: 'hud', order: 20, component: MapNameBanner });
