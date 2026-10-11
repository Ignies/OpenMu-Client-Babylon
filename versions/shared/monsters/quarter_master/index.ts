import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 512,
  Name: 'Quartermaster',
  maxHealth: 90000,
  model: { type: 172, scale: 1.27 },
});
