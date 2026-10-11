import { defineWindow } from '@/controllers/interface/windows';
import { DamageNumbers } from '.';

export default defineWindow({ id: 'damage_numbers', slot: 'world', order: 30, component: DamageNumbers });
