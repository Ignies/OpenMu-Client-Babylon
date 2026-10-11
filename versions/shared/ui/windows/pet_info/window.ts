import { defineWindow } from '@/controllers/interface/windows';
import { PetInfoWindow } from '.';

export default defineWindow({ id: 'pet_info', module: 'pets', slot: 'hud', order: 160, component: PetInfoWindow });
