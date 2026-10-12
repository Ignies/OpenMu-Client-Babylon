import { defineMonster } from '@/controllers/monsters';
import { cards, spotsOn, trail } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 349,
  Name: 'Balgass',
  // The SubType 2 / 3 JOINT_ENERGY ribbons on MoveEye(9, 10)'s eyes (GMCrywolf1st.cpp:674-675, :802), and the
  // BITMAP_LIGHTNING + 1 SubType 0 each lays at its head a tick, living two (ZzzEffectJoint.cpp:3200-3205): two
  // cards a head in `0.5 + Luminosity * (0.25, 0.01, 1)`, which holds blue at 1 and red within 0.08 of 0.7.
  bodyFx: [
    trail(10, 30, 20, [0.5, 0.1, 1]),
    trail(9, 30, 8, [0.5, 0.1, 1]),
    cards([0.7, 0.51, 1], spotsOn([10, 10, 9, 9], 'lightning2', 0.15)),
  ],
  // RenderMonster (GMCrywolf1st.cpp:1425-1436): BodyLight (1, 1, 1), every mesh lit and again RENDER_CHROME2 |
  // RENDER_BRIGHT in BITMAP_CHROME3 (Chrome03, loaded GL_CLAMP_TO_EDGE, ZzzOpenData.cpp:5312).
  bodyLight: [1, 1, 1],
  passes: { passes: [{ mesh: -1, kind: 'add', map: 'chrome2', texture: 'Effect/Chrome03.OZJ', clamp: true }] },
  model: { type: 89, scale: 2 },
});
