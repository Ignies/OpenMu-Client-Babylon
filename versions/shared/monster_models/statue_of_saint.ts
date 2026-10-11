import { defineMonsterModel } from '@/controllers/monsters';

export default defineMonsterModel({
  type: 60,
  name: 'Statue Of Saint',
  // Statue of Saint: RenderMeshEffect(0, MODEL_STONE_COFFIN) (ZzzObject.cpp:1386).
  shatter: 'crystal',
  voices: [null, null, null, null, null],
});
