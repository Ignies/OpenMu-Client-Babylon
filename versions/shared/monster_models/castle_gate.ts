import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 61,
  name: 'Castle Gate',
  // Castle gate: RenderMeshEffect(0, MODEL_GATE) (ZzzObject.cpp:1402).
  shatter: 'gate',
  voices: [null, null, null, null, null],
});
