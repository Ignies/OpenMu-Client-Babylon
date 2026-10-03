import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 283,
  name: 'PLAYER_STOP_RAGEFIGHTER',
  // The Rage Fighter's own stance and Uniria clips, named over the 0.40 from PLAYER_SIT1 up (ZzzOpenData.cpp:339-340, :428-431).
  speed: 0.16,
});
