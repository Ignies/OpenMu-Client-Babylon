import { defineMonster } from '@/controllers/monsters';
import { trail } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 349,
  Name: 'Balgass',
  // The SubType 2 / 3 JOINT_ENERGY ribbons on MoveEye(9, 10)'s eyes (GMCrywolf1st.cpp:674-675, :802).
  // Not here yet: the BITMAP_LIGHTNING + 1 each lays at its head a tick (ZzzEffectJoint.cpp:3200-3206).
  bodyFx: [trail(10, 30, 20, [0.5, 0.1, 1]), trail(9, 30, 8, [0.5, 0.1, 1])],
  // RenderMonster (GMCrywolf1st.cpp:1425-1436): BodyLight (1, 1, 1), every mesh lit and again RENDER_CHROME2 |
  // RENDER_BRIGHT in BITMAP_CHROME3 (Chrome03, loaded GL_CLAMP_TO_EDGE, ZzzOpenData.cpp:5312).
  bodyLight: [1, 1, 1],
  passes: { passes: [{ mesh: -1, kind: 'add', map: 'chrome2', texture: 'Effect/Chrome03.OZJ', clamp: true }] },
  model: { type: 89, scale: 2 },
});
