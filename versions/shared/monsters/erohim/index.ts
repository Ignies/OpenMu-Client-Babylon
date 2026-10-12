import { defineMonster } from '@/controllers/monsters';
import { CHROME01, fixedLight } from '@/controllers/item_fx/itemLooks';
import { EROHIM_FX } from './bodyFx';

/** The BodyLight his chrome over meshes 0, 1, 3 and the pattern take. */
const GOLD = fixedLight(0.75, 0.65, 0.5);

export default defineMonster({
  Numb: 295,
  Name: 'Erohim',
  maxHealth: 3000000,
  // MODEL_EROHIM: see `bodyFx.ts`.
  bodyFx: EROHIM_FX,
  // RenderMonster (GMHuntingGround.cpp:885-920). Not here: mesh 5's bosswing underlay, drawn lit just before its
  // own texture (:892-895).
  passes: {
    passes: [
      { mesh: 4, kind: 'add', ...CHROME01, light: fixedLight(1, 0.5, 0) },
      { mesh: 0, kind: 'add', ...CHROME01, light: GOLD },
      { mesh: 1, kind: 'add', ...CHROME01, light: GOLD },
      { mesh: 3, kind: 'add', ...CHROME01, light: GOLD },
      {
        mesh: 0,
        kind: 'add',
        texture: 'Monster/bossmap1_R.OZJ',
        clamp: true,
        light: GOLD,
        gain: ms => Math.sin(ms * 0.0012) * 0.3 + 0.6,
      },
    ],
  },
  model: { type: 87, scale: 2 },
  stats: {
    Rate: 1,
    Level: 128,
    HP: 200000,
    MP: 0,
    MinDmg: 1050,
    MaxDmg: 1200,
    Def: 800,
    MagDef: 0,
    AttackSuccess: 1200,
    Move: 500,
    AttType: 3,
    Range: 150,
    View: 6,
    MoveSpeed: 8,
    AttSpeed: 650,
    Regen: 1600,
    Attri: 43200,
    ItemR: 2,
    MoneyR: 70,
    MaxI: 30,
    ResWind: 4,
    ResPois: 0,
    ResIce: 2500,
    ResWater: 2500,
    ResFire: 2500,
  },
});
