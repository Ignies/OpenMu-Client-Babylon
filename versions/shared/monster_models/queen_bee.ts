import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 83,
  name: 'Queen Bee',
  // ReceiveMagic plays no eThunder for MODEL_QUEEN_BEE's Lightning (3) (WSclient.cpp:4279).
  quietCasts: [3],
});
