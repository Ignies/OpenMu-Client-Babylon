import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 361,
  Name: 'Nightmare',
  // AT_SKILL_TELEPORT in Kanturu 3rd: this sound instead of CreateTeleportBegin (WSclient.cpp:4319-4327);
  // nightmare_tele loads with 1 channel (MapManager.cpp:504).
  teleport: { sound: 'Sound/w39/nightmare_tele', channels: 1, world: 39 },
  model: { type: 121, scale: 1.6 },
});
