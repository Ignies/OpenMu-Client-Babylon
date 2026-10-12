import { describe, expect, it } from 'vitest';
import { setLookState, type BodyFxEmitter } from '@/controllers/monsters';
import { MonsterActionType as A } from '../objects/enum';
import { monsters } from './all';

/** The rows of one kind a type's folder writes. */
function rows<K extends BodyFxEmitter['kind']>(numb: number, kind: K): Extract<BodyFxEmitter, { kind: K }>[] {
  return (monsters.def(numb)?.bodyFx ?? []).filter((e): e is Extract<BodyFxEmitter, { kind: K }> => e.kind === kind);
}

/** Every card as `bone:sheet@scale` with its row's light. */
const cards = (numb: number) =>
  rows(numb, 'cards').flatMap(r => r.spots.map(s => `${s.bone}:${s.card}@${s.scale} ${r.colour.join(',')}`));

const trails = (numb: number) => rows(numb, 'trail').map(t => `${t.bone} ${t.widthCm}cm x${t.maxTails} ${t.colour.join(',')}`);

describe('boss bodies', () => {
  // RenderMonsterVisual's MODEL_MEDUSA (GMSwampOfQuiet.cpp:1044-1134).
  it('light Medusa from the swamp file', () => {
    expect(cards(561).sort()).toEqual(
      [
        '5:lightMarks@2 0.9,0.8,0.3',
        '5:light@2.4 0.1,1,0',
        '33:lightMarks@1.2 0.9,0.8,0.3',
        '33:light@1.4 0.1,1,0',
        '34:lightRed@0.4 1,1,1',
        '35:lightRed@0.4 1,1,1',
        '68:light@4 0.1,1,0',
        '68:shockWave@0.35 0.9,1,0.1',
        '68:shockWave@0.22 0.9,1,0.1',
        '68:shiny2@1.2 0.9,1,0.9',
        '66:lightRed@0.4 1,1,1',
        '67:lightRed@0.4 1,1,1',
        '69:lightRed@0.4 1,1,1',
        '70:lightRed@0.4 1,1,1',
        '19:hole@0.2 1,1,1',
        '31:hole@0.2 1,1,1',
      ].sort()
    );
    // MoveEye(34, 35) feeds the SubType 55 / 56 eye ribbons; SubType 57 rides bones 67 and 70 with 15 tails.
    expect(trails(561).sort()).toEqual(['34 6cm x8 1,0,0', '35 6cm x8 1,0,0', '67 10cm x15 0.1,0.6,0.3', '70 10cm x15 0.1,0.6,0.3']);
    const [neck, die] = rows(561, 'puff');
    expect(neck).toMatchObject({ every: 6, bones: [5], particles: ['smoke50', ['smokeLine1', 'smokeLine2', 'smokeLine3']], colour: [0.25, 1, 0] });
    expect(die).toMatchObject({ every: 3, bones: [0, 5, 124], particles: ['smoke1', 'smoke1'], gate: { action: [A.Die] } });
  });

  // MoveMonsterVisual's Attack1 / Attack2 past frame 2: at bones 19 and 31, (10, 5, 0) out, a mono fire a tick
  // and a second on half of them, turned with her and riding her, and the BITMAP_HOLE card (:544-576); a
  // BITMAP_WATERFALL_4 on bone 68 one tick in two (:1082-1085).
  it('fires Medusa\'s hands through her attacks and waters bone 68', () => {
    const attack = { action: [A.Attack1, A.Attack2], frames: [[3, Infinity]] };
    const jets = ['fireMono1_4', 'fireMono2_8', 'fireMono3_5'];
    const [, , first, second, water] = rows(561, 'puff');
    for (const r of [first, second]) {
      expect(r).toMatchObject({ bones: [19, 31], local: [10, 5, 0], particles: [jets], colour: [0, 1, 0.5], scale: 1.5 });
      expect(r).toMatchObject({ turned: true, ride: 'body', gate: attack });
    }
    expect([first.every, second.every, second.rollEach]).toEqual([1, 2, true]);
    expect(water).toMatchObject({
      every: 2,
      bones: [68],
      particles: ['waterfall4Orbit0', 'waterfall4Orbit1', 'waterfall4Orbit2'],
      colour: [0.9, 1, 0.9],
      ride: 'bone',
    });
    const hole = rows(561, 'cards').find(r => r.spots[0].card === 'hole');
    expect(hole).toMatchObject({
      spots: [
        { bone: 19, card: 'hole', scale: 0.2, local: [10, 5, 0] },
        { bone: 31, card: 'hole', scale: 0.2, local: [10, 5, 0] },
      ],
      colour: [1, 1, 1],
      swell: { speed: 0.005, amount: 0.1 },
      gate: attack,
    });
  });
});

describe('Kundun', () => {
  // MODEL_ILLUSION_OF_KUNDUN: the bone 6 smoke (GMHellas.cpp:1433-1440), and while alive the red eyes, the
  // swelling blue flare on bone 100 and its smoke (:1570-1632).
  it('smokes from bone 6 and lights his eyes and bone 100 while alive', () => {
    const [bone6, bone100] = rows(275, 'puff');
    expect(bone6).toMatchObject({ every: 2, bones: [6], particles: ['smoke17'], colour: [1, 0.2, 0], local: [2, 30, 0] });
    expect(bone100).toMatchObject({ every: 2, bones: [100], particles: ['smoke13'], gate: { alive: true } });
    const [eyes, flare] = rows(275, 'cards');
    expect(eyes).toMatchObject({ colour: [1, 0, 0], pulse: { speed: 0.003, amount: 0.2, base: 0.8 }, gate: { alive: true } });
    expect(cards(275)).toEqual(['8:energy@0.4 1,0,0', '9:energy@0.4 1,0,0', '100:flareBlue@1.2 1,1,1', '100:flareRed@1.2 1,1,1']);
    expect(flare).toMatchObject({ swell: { speed: 0.001, amount: 0.3 }, gate: { alive: true } });
  });

  // The Shock roar: a red flare over the blue one at `(1.2 + sin * 0.3) * fRoar`, and the bone 100 smoke at
  // `fRoar` (GMHellas.cpp:1596-1626).
  it('roars red through Shock and swells his bone 100 smoke', () => {
    const roar = rows(275, 'cards').find(r => r.spots[0].card === 'flareRed');
    expect(roar).toMatchObject({
      spots: [{ bone: 100, card: 'flareRed', scale: 1.2 }],
      colour: [1, 1, 1],
      swell: { speed: 0.001, amount: 0.3 },
      roar: true,
      gate: { alive: true, action: [A.Shock] },
    });
    expect(rows(275, 'puff')[1]).toMatchObject({ bones: [100], particles: ['smoke13'], roar: true });
  });
});

describe("Selupan's body", () => {
  // RenderMonster's MODEL_SELUPAN (GM_Raklion.cpp:1504-1549): mesh 3 bright twice, mesh 5 bright on its own scroll,
  // Chrome02 over mesh 4 by CHROME4, serufanarm_R four times over mesh 0 at `(sinf(WorldTime * 0.002f) + 1) * 0.5`,
  // and from pattern 2 on (`m_byDetailState >= BATTLE_OF_SELUPAN_PATTERN_2`, :1537) Magic_b by CHROME6 and Chrome02 by
  // CHROME4 over mesh 1.
  it('draws his RenderMonster passes', () => {
    const set = monsters.def(459)?.passes;
    const shape = set?.passes.map(p => [p.mesh, p.kind, p.map ?? '', p.texture ?? ''].join(' '));
    expect(shape).toEqual([
      '3 bright  ',
      '5 bright  ',
      '4 add chrome4 Effect/Chrome02.OZJ',
      '0 add  Monster/serufanarm_R.OZJ',
      '0 add  Monster/serufanarm_R.OZJ',
      '0 add  Monster/serufanarm_R.OZJ',
      '0 add  Monster/serufanarm_R.OZJ',
      '1 add chrome6 Effect/magic_b.OZJ',
      '1 add chrome4 Effect/Chrome02.OZJ',
      '3 add  ',
    ]);
    const [, scroll, , arm] = set?.passes ?? [];
    expect([scroll?.u?.(12345), scroll?.v?.(12345)]).toEqual([2345 * 0.0002, 2345 * 0.0002]);
    expect(arm?.gain?.(1000)).toBeCloseTo((Math.sin(2) + 1) * 0.5);
    expect(arm?.clamp).toBe(true);
    const pattern = set?.passes.slice(7, 9) ?? [];
    let detail = 2;
    setLookState('raklionSelupan', () => detail);
    expect(pattern.map(p => p.when?.())).toEqual([false, false]);
    detail = 3;
    expect(pattern.map(p => p.when?.())).toEqual([true, true]);
  });
});

/** Every blur as `from(local)>to(local) sheet light [gate]`. */
const blurs = (numb: number) =>
  rows(numb, 'blur').map(b => {
    const at = (bone: number, local?: readonly number[]) => (local ? `${bone}(${local.join(',')})` : `${bone}`);
    const gate = b.gate ? ` ${b.gate.action?.join('/')}${b.gate.frames ? ` ${b.gate.frames.map(w => w.join('-')).join(',')}` : ''}` : '';
    return `${at(b.from, b.fromLocal)}>${at(b.to, b.toLocal)} ${b.sheet} ${b.colour.join(',')}${gate}${b.short ? ' short' : ''}${b.dark ? ' dark' : ''}`;
  });

describe('the swing blurs', () => {
  // The RenderObject / RenderMonsterVisual CreateBlur loops: Nightmare (GM_Kanturu_3rd.cpp:961-988), Selupan and the
  // Iron Knights (GM_Raklion.cpp:1977-1998, :1851-1873, :2104-2126), the Dark Elf on his weapon's LinkBone 33
  // (GMCrywolf1st.cpp:1254-1282, ZzzCharacter.cpp:12069), the Sapis' claws (GMSwampOfQuiet.cpp:620-795).
  it("trail the bosses' blades and the Sapis' claws", () => {
    expect(blurs(361)).toEqual([`32(10,0,0)>38(10,-10,0) blur02 1,1,1 ${A.Attack1}/${A.Attack4} 0-5.9 short`]);
    expect(blurs(459)).toEqual(['69>73 blur01 1,1.2,2']);
    for (const knight of [458, 565]) expect(blurs(knight)).toEqual(['35>36 blur02 1,1.2,2']);
    for (const elf of [340, 440]) expect(blurs(elf)).toEqual([`33(0,0,-60)>33(0,0,-150) blur02 1,1,1 ${A.Attack1}/${A.Attack2} short`]);
    const claws = (from: number, to: number[], light: string, frames: string) =>
      to.map(b => `${from}>${b} blur01 ${light} ${A.Attack1}/${A.Attack2} ${frames}`);
    const hand = [34, 35, 38, 39, 43];
    for (const sapi of [441, 557, 560]) expect(blurs(sapi)).toEqual(claws(42, hand, '1,0.6,0.1', '6-7.6'));
    expect(blurs(442)).toEqual(claws(42, hand, '2,0,0', '6-7'));
    expect(blurs(443)).toEqual([...claws(42, hand, '0.3,0.7,1', '5-10'), ...claws(75, [76, 79, 80, 83, 84], '0.3,0.7,1', '5-10')]);
  });
});

describe('the Iron Knights', () => {
  // RenderMonsterVisual (GM_Raklion.cpp:1875-1897, :2128-2150): bones 20, 37, 45, 51 each roll `rand() % 6`, pick
  // (0.3, 0.6, 1) two times in three or (0.8, 0.8, 0.8), and throw SMOKE SubType 50 and a SMOKELINE SubType 2 at 0.8.
  it('smoke from four bones in blue or grey', () => {
    const blue = [0.3, 0.6, 1];
    for (const knight of [458, 565]) {
      expect(rows(knight, 'puff')).toEqual([
        {
          kind: 'puff',
          every: 6,
          bones: [20, 37, 45, 51],
          particles: ['smoke50', ['smokeLine1_2', 'smokeLine2_2', 'smokeLine3_2']],
          scales: [1, 0.8],
          colour: blue,
          colours: [blue, blue, [0.8, 0.8, 0.8]],
          rollEach: true,
        },
      ]);
    }
  });

  // Dying, before Die frame 1, six MODEL_EFFECT_BROKEN_ICE0 + rand() % 3 a tick at each of the four bones in
  // (0.3, 0.5, 1) (:1960-1970, :2213-2223).
  it('break into ice as they die', () => {
    for (const knight of [458, 565]) {
      expect(rows(knight, 'shards')).toEqual([
        { kind: 'shards', every: 1, shards: 'brokenIce', count: 6, bones: [20, 37, 45, 51], colour: [0.3, 0.5, 1], gate: { action: [A.Die], frames: [[0, 1]] } },
      ]);
    }
  });
});

describe('the Aida and Kanturu swing blurs', () => {
  // MoveAidaBlurEffect (GMAida.cpp:535-721), MoveKanturu1stBlurEffect (GM_Kanturu_1st.cpp:1604-1926) and
  // Move_Kanturu2nd_BlurEffect (GM_Kanturu_2nd.cpp:1276-1380), by the model each type is drawn with.
  it('trail each by its model', () => {
    const atk = `${A.Attack1}/${A.Attack2}`;
    for (const rider of [306, 550])
      expect(blurs(rider)).toEqual([`18(20,0,0)>20(100,0,0) blur02 1,1,1 ${atk} 0-5.06 short`, `25(20,0,0)>26(100,0,0) blur02 1,1,1 ${atk} 0-5.06 short`]);
    for (const orc of [307, 549])
      expect(blurs(orc)).toEqual([35, 39, 43].map(b => `${b}(20,0,0)>${b + 2}(60,0,0) blur02 0.5,0.5,0 ${atk} short`));
    expect(blurs(308)).toEqual([`26(0,0,20)>27(0,0,70) blur02 0.3,0.3,0.3 ${A.Attack1} short`]);
    for (const satyros of [353, 497]) expect(blurs(satyros)).toEqual([`44(0,0,0)>44(0,0,-200) motionBlur 0.3,1,3.5 ${atk} 3.6-6`]);
    for (const berserker of [350, 435, 553]) expect(blurs(berserker)).toEqual([`33(-20,0,0)>34(100,0,0) motionBlur 0.3,2,0.5 ${atk} 3.5-6.7`]);
    expect(blurs(354)).toEqual([`55(0,0,0)>54(0,0,0) blur01 1,1.2,2 ${atk} 5.9-7.55`]);
    for (const gigantis of [356, 434, 554]) expect(blurs(gigantis)).toEqual([`34(0,0,0)>33(0,0,0) blur01 1,1.2,2 ${atk} 3.5-5.9`]);
    for (const genocider of [357, 555])
      expect(blurs(genocider)).toEqual([49, 51, 50, 52].map(b => `${b}(-40,0,0)>${b}(10,0,0) blur01 1,0.2,0 ${atk} 5.5-6.9 short`));
    for (const twin of [359, 498]) expect(blurs(twin)).toEqual([`58(-150,50,0)>59(150,-200,0) motionBlur 1,0.2,0.5 ${A.Attack1} 0-4.12`]);
    for (const dread of [360, 439])
      expect(blurs(dread)).toEqual([`33(0,0,0)>33(100,120,0) blur01 1,1,1 ${A.Attack1} 0-5 dark`, `33(0,0,0)>33(100,120,0) blur01 1,1,1 ${A.Attack2} 0-9 dark`]);
  });
});

describe('Crywolf', () => {
  const smoke = (numb: number) => rows(numb, 'body').map(r => `${r.every} ${r.recipe} ${r.colour?.join(',') ?? '-'} ${r.gate?.action?.join('/')}`);
  const walk = `${A.Walk}/${A.Run}`;

  // MoveCryWolf1stMonsterVisual: one SMOKE + 1 a tick in ten while walking or running, in each one's light; the
  // Scout's and Balgass's pass none (:729-917).
  it('smoke the walkers', () => {
    for (const n of [318, 314, 349]) expect(smoke(n)).toEqual([`10 sandSmoke - ${walk}`]);
    for (const n of [345, 410, 344, 436, 409]) expect(smoke(n)).toEqual([`10 sandSmoke 0.9,0.2,0.1 ${walk}`]);
    for (const n of [341, 437, 411, 313, 315]) expect(smoke(n)).toEqual([`10 sandSmoke 1,1,1 ${walk}`]);
  });

  // MoveCryWolf1stBlurEffect (:1166-1410): the Scout, the Death Spirit, the Werewolf Hero, the Solam.
  it('trail their swings', () => {
    for (const n of [318, 314]) expect(blurs(n)).toEqual([12, 20].map(b => `${b}(20,0,0)>${b + 4}(60,0,0) blur02 1,1,1 ${A.Attack1} short`));
    for (const n of [345, 410]) expect(blurs(n)).toEqual([`27(0,250,0)>27(0,0,0) blur02 0.2,1,0.4 ${A.Attack1}/${A.Attack2} short`]);
    for (const n of [313, 315]) expect(blurs(n)).toEqual([`80(0,0,-90)>80(0,0,0) blur02 1,1,1 ${A.Attack2} short`, `82(0,0,90)>82(0,0,0) blur02 1,1,1 ${A.Attack2} short`]);
    for (const n of [311, 317]) expect(blurs(n)).toEqual([`25(0,0,120)>25(0,0,0) blur02 1,1,1 ${A.Attack1} short`]);
    expect(cards(315)).toEqual(['6:light@3.5 0.9,0.2,0.1']);
  });

  // RenderCryWolf1stMonsterVisual's Valam (:1948-1968), only in Crywolf and Devil Square, halved through Attack1 / 2.
  it("light the Valam's centre and shine its ends", () => {
    for (const n of [312, 316]) {
      expect(cards(n)).toEqual([
        '28:light@1 0,0.5,0.1', ...[27, 27, 29, 29].map(b => `${b}:shiny2@0.5 0.5,0.5,0.5`),
        '28:light@0.5 0,0.5,0.1', ...[27, 27, 29, 29].map(b => `${b}:shiny2@0.25 0.5,0.5,0.5`),
      ]);
      const [light, , half] = rows(n, 'cards');
      expect(light.pulse).toEqual({ speed: 0.0012, amount: 0.8, base: 1.3 });
      expect(half.gate?.action).toEqual([A.Attack1, A.Attack2]);
      expect(light.gate?.when?.()).toBe(false);
    }
  });
});

describe('Selupan', () => {
  // RenderMonsterVisual's MODEL_SELUPAN (GM_Raklion.cpp:2003-2049): blue lights breathing in colour and size on
  // bones 9 and 70-74, some turning on the world clock.
  it('carries his blue lights on bones 9 and 70-74', () => {
    expect(cards(459)).toEqual([
      '9:light@2.2 0.3,0.6,1',
      '9:light@2.2 0.3,0.6,1',
      '9:light@3.2 0.3,0.6,1',
      '70:light@2.3 0.1,0.2,1',
      '70:shiny6@2 0.1,0.2,1',
      '74:light@2.3 0.1,0.2,1',
      '74:shiny6@2 0.1,0.2,1',
      '71:light@2.5 0.1,0.2,1',
      '71:shiny2@2.5 0.1,0.2,1',
      '71:shiny6@2.5 0.1,0.2,1',
      '72:light@2 0.1,0.2,1',
      '72:shiny6@1.5 0.1,0.2,1',
      '71:eventCloud@0.6 0.1,0.2,1',
      '71:eventCloud@0.4 0.1,0.2,1',
    ]);
    const [head, hands, clouds] = rows(459, 'cards');
    expect(head).toMatchObject({ lift: { speed: 0.004, amount: 0.25, base: 0.25 }, swell: { speed: 0.004, amount: 0.2 } });
    expect(head.spots[0].local).toEqual([0, 10, 0]);
    expect(hands).toMatchObject({ lift: { speed: 0.004, amount: 0.1, base: 0.1 }, swell: { speed: 0.004, amount: 0.2 } });
    expect(hands.spots.map(s => s.spin ?? 0)).toEqual([0.08, 0, 0.08, 0, 0, 0.08, 0.15, 0, 0]);
    expect(clouds).toMatchObject({ lift: { speed: 0.004, amount: 0.1, base: 0.1 } });
    expect(clouds.swell).toBeUndefined();
    expect(clouds.spots.map(s => s.spin)).toEqual([-0.1, -0.2]);
  });
});

/** A pass as `mesh kind map texture` and the light it writes from a grey body. */
const passRows = (numb: number) =>
  (monsters.def(numb)?.passes?.passes ?? []).map(p => {
    const out = { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { Object.assign(out, { x, y, z }); } };
    p.light?.(0, { x: 0.5, y: 0.5, z: 0.5 } as never, out as never);
    const light = p.light ? ` @${[out.x, out.y, out.z].join(',')}` : '';
    return `${p.mesh} ${p.kind} ${p.map ?? ''} ${p.texture ?? ''}${light}`.replace(/ +/g, ' ').trim();
  });

describe("Erohim's body", () => {
  // RenderMonster's MODEL_EROHIM (GMHuntingGround.cpp:885-920): Chrome01 over mesh 4 at (1, 0.5, 0) and over 0, 1
  // and 3 at (0.75, 0.65, 0.5), and bossmap1_R over mesh 0 in that light at `sinf(WorldTime * 0.0012f) * 0.3 + 0.6`.
  it('chromes his meshes in his own tints', () => {
    expect(passRows(295)).toEqual([
      '4 add chrome Effect/Chrome01.OZJ @1,0.5,0',
      '0 add chrome Effect/Chrome01.OZJ @0.75,0.65,0.5',
      '1 add chrome Effect/Chrome01.OZJ @0.75,0.65,0.5',
      '3 add chrome Effect/Chrome01.OZJ @0.75,0.65,0.5',
      '0 add Monster/bossmap1_R.OZJ @0.75,0.65,0.5',
    ]);
    const pattern = monsters.def(295)?.passes?.passes[4];
    expect(pattern?.gain?.(1000)).toBeCloseTo(Math.sin(1.2) * 0.3 + 0.6);
    expect(pattern?.clamp).toBe(true);
  });
});

describe('the Imperial Guardian bodies', () => {
  // RenderMonster's MODEL_RAYMOND, MODEL_LUCAS (GMEmpireGuardian1.cpp:1831-1866) and MODEL_DARK_GHOST
  // (GMEmpireGuardian2.cpp:833-847).
  it('give Raymond his sword pass and chrome, Lucas his chrome and the Dark Ghost his bright mesh 3', () => {
    // raymond_sword_R over mesh 1 in BodyLight[0] * 3 grey at `(sinf(WorldTime * 0.003f) + 1) * 0.5`.
    expect(passRows(506)).toEqual(['1 add Effect/raymond_sword_R.OZJ @1.5,1.5,1.5', '3 add chrome Effect/Chrome01.OZJ']);
    expect(monsters.def(506)?.passes?.passes[0].gain?.(1000)).toBeCloseTo((Math.sin(3) + 1) * 0.5);
    expect(passRows(507)).toEqual(['3 add chrome Effect/Chrome01.OZJ']);
    expect(monsters.def(507)?.passes?.drawn).toEqual([0, 1, 2, 3, 4]);
    expect(passRows(515)).toEqual(['3 bright']);
    expect(monsters.def(515)?.passes?.passes[0].gain?.(0)).toBe(0.5);
    expect(monsters.def(515)?.passes?.drawn).toEqual([0, 1, 2, 3]);
  });
});

describe('Erohim', () => {
  // RenderHuntingGroundMonsterVisual's MODEL_EROHIM (GMHuntingGround.cpp:672-712): two red lights on each eye, and
  // through Attack2 a true fire and a smoke from the left hand. Monster82_LHand is not his bone, so the fire is a
  // plain SubType 0 one (ZzzEffectParticle.cpp:8281-8298).
  it('lights his eyes and fires his left hand through Attack2', () => {
    expect(cards(295)).toEqual(['8:light@0.5 0.9,0.2,0.1', '8:light@0.5 0.9,0.2,0.1', '9:light@0.5 0.9,0.2,0.1', '9:light@0.5 0.9,0.2,0.1']);
    expect(rows(295, 'cards')[0].spots[0].local).toEqual([0, -2, 0]);
    expect(rows(295, 'puff')).toEqual([
      expect.objectContaining({ every: 1, bones: [16], local: [0, 0, -10], particles: ['trueFire'], scale: 3, gate: { action: [A.Attack2] } }),
      expect.objectContaining({ every: 1, bones: [16], local: [0, 0, -10], particles: ['smoke21'], scale: 2, gate: { action: [A.Attack2] } }),
    ]);
  });
});

describe("Balgass's body", () => {
  // RenderMonster's MODEL_BALGASS (GMCrywolf1st.cpp:1425-1436): BodyLight (1, 1, 1), and every mesh lit and again
  // RENDER_CHROME2 | RENDER_BRIGHT in BITMAP_CHROME3 (Chrome03, GL_CLAMP_TO_EDGE).
  it('is drawn at full light with Chrome03 over every mesh', () => {
    const balgass = monsters.def(349);
    expect(balgass?.bodyLight).toEqual([1, 1, 1]);
    expect(balgass?.passes).toEqual({ passes: [{ mesh: -1, kind: 'add', map: 'chrome2', texture: 'Effect/Chrome03.OZJ', clamp: true }] });
  });
});

describe('Balgass', () => {
  // CreateJoint(BITMAP_JOINT_ENERGY, SubType 2 / 3, Scale 30) at his creation (GMCrywolf1st.cpp:674-675) on
  // MoveEye(9, 10)'s eyes (:802): 20 tails on the left (bone 10), 8 on the right (bone 9), in SubType 2 / 3's
  // purple (ZzzEffectJoint.cpp:458-459).
  it('runs his two purple eye ribbons', () => {
    expect(trails(349)).toEqual(['10 30cm x20 0.5,0.1,1', '9 30cm x8 0.5,0.1,1']);
  });

  // SubType 2 / 3's head: a BITMAP_LIGHTNING + 1 SubType 0 a tick, Scale 0.15, living two ticks, in `0.5 + Luminosity *
  // (0.25, 0.01, 1)` (ZzzEffectJoint.cpp:3200-3205, ZzzEffectParticle.cpp:230-262): blue held at 1, red within 0.08 of 0.7.
  it('lays a lightning card at each ribbon head', () => {
    expect(cards(349)).toEqual([10, 10, 9, 9].map(b => `${b}:lightning2@0.15 0.7,0.51,1`));
    // `sinf(WorldTime * 0.002f) * 0.3f` of Luminosity is 0.075 on red and next to nothing on green.
    expect(rows(349, 'cards')[0].lift).toEqual({ speed: 0.002, amount: 0.075, base: 0, channels: [1, 0.04, 0] });
  });
});

describe('the all-additive deaths', () => {
  // `o->BlendMesh = -2` dying: the Maya hands before MAYA3 (GM_Kanturu_3rd.cpp:885-897, :914-926; no Kanturu state
  // here reads 0), the Dark Ghost always (GMEmpireGuardian2.cpp:942-944).
  it('turn the Maya hands and the Dark Ghost bright as they die', () => {
    expect([362, 363, 515].map(n => monsters.def(n)?.dyingBlendAll?.())).toEqual([true, true, true]);
    expect(monsters.def(361)?.dyingBlendAll).toBeUndefined();
  });
});

describe("Nightmare's death", () => {
  // MoveMonsterVisual's Die from frame 3: two SMOKE + 3 SubType 3 at Scale 1.5 from Body_Bone13 (bone 63) a tick
  // (GM_Kanturu_3rd.cpp:865-869).
  it('smokes dark from bone 63 as he falls', () => {
    expect(rows(361, 'puff')).toEqual([
      expect.objectContaining({ every: 1, bones: [63], particles: ['fire1_3'] }),
      expect.objectContaining({ every: 1, bones: [63], particles: ['smoke3_3', 'smoke3_3'], scale: 1.5, gate: { action: [A.Die], frames: [[3, Infinity]] } }),
      expect.objectContaining({ particles: ['spark1_16'] }),
    ]);
  });

  // RenderKanturu3rdMonsterVisual's Windmill_Bone1 (bone 47) on half the ticks while alive (GM_Kanturu_3rd.cpp:1078-1080);
  // MoveMonsterVisual's Attack3 flares every tick and the Attack2 storm and laser at frames 5.2-5.8 (:840-862).
  it('throws his windmill sparks and stages his Attack2 and Attack3', () => {
    expect(rows(361, 'puff')[2]).toEqual({ kind: 'puff', every: 2, bones: [47], particles: ['spark1_16'], colour: [1, 1, 1], turned: true, gate: { alive: true } });
    expect(rows(361, 'call').map(r => [r.every, r.gate])).toEqual([
      [1, { action: [A.Attack3] }],
      [1, { action: [A.Attack2], frames: [[5.2, 5.8]] }],
    ]);
  });

  // RenderKanturu3rdMonsterVisual, alive: a BITMAP_FIRE + 1 SubType 3 at Scale 1.7 on his Angle from Body_Bone13 a tick
  // (GM_Kanturu_3rd.cpp:1061-1062).
  it('burns at bone 63 while he lives', () => {
    expect(rows(361, 'puff')[0]).toEqual({ kind: 'puff', every: 1, bones: [63], particles: ['fire1_3'], colour: [1, 1, 1], scale: 1.7, turned: true, gate: { alive: true } });
  });
});

describe('Nightmare', () => {
  // MODEL_DARK_SKULL_SOLDIER_5 (GM_Kanturu_3rd.cpp:666-705, :1005-1081): the SubType 18-21 ribbons on MoveEye(9, 10,
  // 39, 40)'s eyes and the white cards on his registered bones, none of it once he dies.
  it('runs his four eye ribbons and lights his bones while alive', () => {
    expect(trails(361)).toEqual(['10 10cm x8 0.8,0.5,1', '9 10cm x8 0.8,0.5,1', '40 10cm x8 0.8,0.5,1', '39 10cm x8 0.8,0.5,1']);
    expect(rows(361, 'trail').every(t => t.gate?.alive)).toBe(true);
    expect(cards(361)).toEqual([
      ...[61, 62, 54, 55, 21, 22].flatMap(b => [`${b}:light@0.3 1,1,1`, `${b}:flareBlue@0.5 1,1,1`]),
      ...[25, 26, 71, 70, 43, 44].flatMap(b => [`${b}:light@0.4 1,1,1`, `${b}:flareBlue@0.7 1,1,1`]),
      ...[39, 40].flatMap(b => [`${b}:light@0.3 1,1,1`, `${b}:flareBlue@0.6 1,1,1`]),
      '9:flareBlue@0.3 1,1,1',
      '10:flareBlue@0.3 1,1,1',
    ]);
    const [spots] = rows(361, 'cards').map(r => r.spots);
    expect(spots.filter(s => s.local).map(s => `${s.bone} ${s.local?.join(',')}`)).toEqual([
      '21 5,0,0', '21 5,0,0', '22 9,0,0', '22 9,0,0', '25 6,0,0', '25 6,0,0', '43 10,0,0', '43 10,0,0',
      '39 3,0,0', '39 3,0,0', '40 3,0,0', '40 3,0,0', '9 0,-2,0', '10 4,-4,0',
    ]);
    expect(rows(361, 'cards')[0].gate?.alive).toBe(true);
  });
});

describe("the Maya hands' death and Stop2", () => {
  // MoveMonsterVisual (GM_Kanturu_3rd.cpp:879-937): dying before the MAYA3 direction state, five WATERFALL_3 SubType 6
  // at Scale 2 a tick at `BoneTransform[rand() % 45]`; in Stop2 from MAYA3 on, a SMOKE + 3 SubType 3 at 1.5 and a
  // SubType 4 at 0.8 a tick off the palm (left bone 24 at (0, -50, 0), right bone 12 at (50, 0, 0)).
  it('drop their blue drops as they die and smoke from the palm in Stop2', () => {
    for (const [numb, palm, local] of [
      [362, 24, [0, -50, 0]],
      [363, 12, [50, 0, 0]],
    ] as const) {
      const [die, stop] = rows(numb, 'puff');
      expect(die).toMatchObject({ every: 1, particles: ['waterfall3_6'], pick: 5, scale: 2, colour: [0.4, 0.6, 1], gate: { action: [A.Die] } });
      expect(die.bones).toEqual(Array.from({ length: 45 }, (_, i) => i));
      expect(stop).toMatchObject({ every: 1, bones: [palm], local, particles: ['smoke3_3', 'smoke3_4'], scales: [1.5, 0.8], gate: { action: [A.Stop2] } });
      expect([typeof die.gate?.when, typeof stop.gate?.when]).toEqual(['function', 'function']);
    }
  });
});

describe('the Maya hands', () => {
  // GM_Kanturu_3rd.cpp:707-783 (the ribbons on each hand's MoveEye bones) and :1083-1226 (the cards on the fingers),
  // none once a hand dies. The left's SubType 18-21 / 27 run JointLaser01 in purple, the right's 28-31 / 33 the
  // flare sheet in white (ZzzEffectJoint.cpp:286-325, :462).
  it('run the fingers ribbons and light the finger bones while alive', () => {
    expect(trails(362)).toEqual(['11 15cm x8 0.8,0.5,1', '5 15cm x8 0.8,0.5,1', '29 15cm x8 0.8,0.5,1', '17 15cm x8 0.8,0.5,1', '23 15cm x8 0.8,0.5,1']);
    expect(trails(363)).toEqual(['20 15cm x8 1,1,1', '5 15cm x8 1,1,1', '42 15cm x8 1,1,1', '31 15cm x8 1,1,1', '53 15cm x8 1,1,1']);
    expect(rows(363, 'trail').every(t => t.ribbon === 'flare' && t.gate?.alive)).toBe(true);
    expect(cards(362)).toEqual([
      ...[7, 13, 19, 25, 31].flatMap(b => [`${b}:flareBlue@1.3 0.5,0.5,0.8`, `${b}:flareBlue@0.7 0.5,0.5,0.8`]),
      ...[12, 18, 24, 30, 6].map(b => `${b}:flareBlue@1 0.5,0.5,0.8`),
    ]);
    expect(cards(363)).toEqual([
      ...[59, 48].flatMap(b => [`${b}:flareRed@1.5 0.5,0.3,0.3`, `${b}:flareRed@0.7 0.5,0.3,0.3`]),
      ...[11, 37, 26].flatMap(b => [`${b}:flareRed@1.3 0.5,0.3,0.3`, `${b}:flareRed@0.7 0.5,0.3,0.3`]),
      ...[54, 43, 32, 6, 21].map(b => `${b}:flareRed@1 0.5,0.3,0.3`),
    ]);
    expect(rows(363, 'cards')[0].spots.map(s => (s.local ?? [0, 0, 0]).join(','))).toEqual([
      '-2,0,4', '-10,-3,3', '-1,-2,4', '-10,-3,5', '0,0,4', '-10,0,4', '0,0,4', '-10,1,4', '6,3,3', '-5,10,5',
      '0,0,-5', '0,0,-2', '0,0,-5', '0,0,-5', '10,-4,0',
    ]);
    expect([rows(362, 'cards')[0].gate?.alive, rows(363, 'cards')[0].gate?.alive]).toEqual([true, true]);
  });
});

describe('the Imperial Guardian bosses', () => {
  // Under eBuff_Berserker each smokes red from every fifth bone of its body (GMEmpireGuardian1.cpp:2093-2108 and
  // the same walk in the other three files); the bodies' NumBones are those of Monster165-172.bmd.
  it('smoke red from every fifth bone in their rage', () => {
    const bones: Record<number, number> = { 504: 72, 505: 103, 506: 61, 507: 76, 508: 76, 509: 53, 510: 127, 511: 145 };
    for (const [numb, count] of Object.entries(bones)) {
      const rage = rows(+numb, 'puff').find(p => p.gate?.buff === 81);
      expect(rage, numb).toMatchObject({ every: 6, rollEach: true, particles: ['smoke50', ['smokeLine1', 'smokeLine2', 'smokeLine3']], colour: [1, 0.1, 0.1] });
      expect(rage?.bones, numb).toEqual(Array.from({ length: Math.ceil(count / 5) }, (_, i) => i * 5));
    }
  });

  // MODEL_LUCAS (GMEmpireGuardian1.cpp:2113-2145): green lights on bones 41, 42 and 50-55, swinging in light and
  // size on `(sinf(WorldTime * 0.004f) + 0.9f) * 0.25f`.
  it('light Lucas on bones 41, 42 and 50-55', () => {
    expect(cards(507)).toEqual([
      '41:light@1.225 0.05,0.75,0.35',
      '41:light@1.225 0.05,0.75,0.35',
      '42:light@1.225 0.05,0.75,0.35',
      '42:light@1.225 0.05,0.75,0.35',
      ...[1.2, 1.05, 0.9, 0.75, 0.6, 0.45].map((s, i) => `${50 + i}:light@${+(s + 0.225).toFixed(3)} 0.05,0.75,0.35`),
    ]);
    expect(rows(507, 'cards')[0]).toMatchObject({ lift: { speed: 0.004, amount: 0.25, base: 0.225 }, swell: { speed: 0.004, amount: 0.25 } });
  });

  // MODEL_FRED: the SubType 24 / 25 ribbons on his eyes, 10 tails each in (0.7, 0.7, 1) (GMEmpireGuardian1.cpp:109-111,
  // ZzzEffectJoint.cpp:328-337), and the flare02 card each lays at its head, its size and light
  // `sinf(WorldTime * 0.002f) * 0.1f + 0.2f` (ZzzEffectJoint.cpp:3220-3226).
  it('run Fred eye ribbons with their flares', () => {
    expect(trails(508).slice(0, 2)).toEqual(['15 10cm x10 0.7,0.7,1', '14 10cm x10 0.7,0.7,1']);
    expect(cards(508).slice(0, 2)).toEqual(['15:flare2@0.2 0.7,0.7,1', '14:flare2@0.2 0.7,0.7,1']);
    expect(rows(508, 'cards')[0]).toMatchObject({ pulse: { speed: 0.002, amount: 0.1, base: 0.2 }, swell: { speed: 0.002, amount: 0.1 } });
  });

  // The four SubType 54 ribbons on node_blade01-04 (bones 71-74, MoveEye(14, 15, 71, 72, 73, 74)): Scale 100, Spark03,
  // 30 tails laid two a tick (CreateTail's Blur, ZzzEffectJoint.cpp:2855-2900), so 15 ticks long, drawn only in
  // Attack1 (:6995) (GMEmpireGuardian1.cpp:112-116, ZzzEffectJoint.cpp:394-413).
  it("run Fred's four blade ribbons through Attack1", () => {
    expect(trails(508).slice(2)).toEqual([71, 72, 73, 74].map(b => `${b} 100cm x15 0.7,0.7,1`));
    for (const r of rows(508, 'trail').slice(2)) expect(r).toMatchObject({ ribbon: 'spark', gate: { action: [A.Attack1] } });
    // Each head lays a BITMAP_BLUR card a tick at `Luminosity = sinf(WorldTime * 0.002f) * 0.1f`, its size and its
    // light, dark half the time (ZzzEffectJoint.cpp:3227-3231).
    expect(cards(508).slice(2)).toEqual([71, 72, 73, 74].map(b => `${b}:blur01@0 0.7,0.7,1`));
    expect(rows(508, 'cards')[1]).toMatchObject({ pulse: { speed: 0.002, amount: 0.1, base: 0 }, swell: { speed: 0.002, amount: 0.1 } });
  });

  // MODEL_HAMMERIZE (GMEmpireGuardian2.cpp:864-876): blue lights on bones 21 and 38, swinging on
  // `(sinf(WorldTime * 0.004f) + 1) * 0.25f`.
  it('light Hammerize on bones 21 and 38', () => {
    expect(cards(509)).toEqual(['21:light@1.75 0.1,0.4,0.8', '38:light@1.75 0.1,0.4,0.8']);
    expect(rows(509, 'cards')[0]).toMatchObject({ lift: { speed: 0.004, amount: 0.25, base: 0.25 }, swell: { speed: 0.004, amount: 0.25 } });
  });

  // MODEL_DARK_GHOST: the SubType 22 / 23 ribbons on MoveEye(80, 34)'s eyes (GMEmpireGuardian2.cpp:96-98, :923) and
  // the blue and green lights flickering on `(sinf(WorldTime * 0.08f) + 1) * 0.15f + 0.7f` (:897-920).
  it('light the Dark Ghost and run his eye ribbons', () => {
    expect(trails(515)).toEqual(['34 30cm x10 1,1,1', '80 30cm x10 1,1,1']);
    expect(cards(515)).toEqual([
      ...[93, 100, 47, 54].map(b => `${b}:light@3 0.1,0.6,1`),
      ...[92, 99, 46, 53, 95, 88, 42, 49].map(b => `${b}:light@1 0.1,1,0.2`),
      ...[80, 34].map(b => `${b}:light@3 0.1,1,0.3`),
      // SubType 22 / 23's head: a BITMAP_LIGHTNING + 1 SubType 4 a tick, Scale 0.25, living two ticks (ZzzEffectJoint.cpp:3213-3218,
      // ZzzEffectParticle.cpp:230-262): two cards a head in `sinf(WorldTime * 0.002f) * 0.2f + 0.8f`.
      ...[34, 34, 80, 80].map(b => `${b}:lightning2@0.25 1,1,1`),
    ]);
    expect(rows(515, 'cards')[3].pulse).toEqual({ speed: 0.002, amount: 0.2, base: 0.8 });
  });

  // Through Attack1 / Attack2 a WATERFALL_4 SubType 15 at Scale 2 and two SPARK + 1 SubType 13 (SubType 11's spark) on
  // its Angle from bones 80 and 34, a tick (:925-940); through Die to frame 3, five SMOKE SubType 39 at its feet (:942-950).
  it("throws the Dark Ghost's attack sparks and death smoke", () => {
    const attack = { action: [A.Attack1, A.Attack2] };
    const [water, sparks, smoke] = rows(515, 'puff');
    expect(water).toMatchObject({ every: 1, bones: [80, 34], particles: ['waterfall4_15'], scale: 2, colour: [0.3, 1, 0.8], gate: attack });
    expect(sparks).toMatchObject({ every: 1, bones: [80, 34], particles: ['spark1_11', 'spark1_11'], colour: [0, 0.4, 0], turned: true, gate: attack });
    expect(smoke).toMatchObject({ every: 1, origin: true, particles: Array(5).fill('smoke39'), colour: [0.1, 1, 0.2] });
    expect(smoke.gate).toEqual({ action: [A.Die], frames: [[0, 3]] });
    expect(rows(515, 'cards').slice(0, 3).map(r => r.pulse)).toEqual(Array(3).fill({ speed: 0.08, amount: 0.15, base: 0.85 }));
  });
});

describe('the Swamp of Quiet line', () => {
  // GMSwampOfQuiet.cpp:812-840, :1136-1146: two BITMAP_LIGHT cards on bone 15, in each one's colour.
  it('light the Sapis and the Sapi Queen on bone 15', () => {
    expect([441, 442, 443, 557, 560].map(cards)).toEqual([
      ['15:light@2 1,0.6,0.1', '15:light@2 1,0.6,0.1'],
      ['15:light@2 1,0,0', '15:light@2 1,0,0'],
      ['15:light@2 0.2,0.7,1', '15:light@2 0.2,0.7,1'],
      ['15:light@2 1,0.6,0.1', '15:light@2 1,0.6,0.1'],
      ['15:light@2 1,0.6,0.1', '15:light@2 1,0.6,0.1'],
    ]);
  });

  // :842-1238: the Shadows smoke from six bones, each its own `rand() % 6`.
  it('smoke the Shadows from six bones', () => {
    const smoke = (numb: number) => rows(numb, 'puff')[0];
    for (const [numb, colour, scales] of [
      [444, [1, 0.1, 0.1], [1, 1]],
      [445, [0.3, 0.6, 1], [1, 1]],
      [446, [0.5, 1, 0.5], [1.5, 1.1]],
      [559, [1, 1, 1], [1.5, 1.1]],
    ] as const) {
      expect(smoke(numb), `${numb}`).toMatchObject({ every: 6, rollEach: true, bones: [11, 15, 34, 21, 25, 39], colour, scales, particles: ['smoke50', ['smokeLine1', 'smokeLine2', 'smokeLine3']] });
    }
  });

  // MODEL_NAPIN's blue cards on eleven bones (:971-981); the Blaze and Ice Napins' lights and the fires about
  // bones 10, 61, 72, 21 (`rand() % 20 - 10` off, Scale 1.2) and 122, 116 (`rand() % 10 - 5`, 0.7) (:1002-1043, :1147-1188).
  it('light the Napins and fire the Blaze and Ice ones', () => {
    expect(cards(447)).toEqual([7, 4, 5, 10, 22, 11, 23, 12, 24, 34, 39].map(b => `${b}:light@2.2 0.1,0.2,1`));
    for (const [numb, fire] of [
      [449, [1, 1, 1]],
      [558, [0.25, 0.6, 0.7]],
    ] as const) {
      const light = numb === 449 ? '1,0.2,0' : '1,1,1';
      expect(cards(numb)).toEqual([...[10, 61, 72, 21].map(b => `${b}:light@4 ${light}`), ...[122, 116].map(b => `${b}:light@1 ${light}`)]);
      expect(rows(numb, 'puff')).toEqual([
        expect.objectContaining({ every: 1, bones: [10, 61, 72, 21], particles: [['fire1', 'fire2', 'fire3']], scale: 1.2, jitterCm: 10, colour: fire }),
        expect.objectContaining({ every: 1, bones: [122, 116], particles: [['fire1', 'fire2', 'fire3']], scale: 0.7, jitterCm: 5, colour: fire }),
      ]);
    }
  });

  // MODEL_GHOST_NAPIN (:990-1000): at seven bones a tick, a SMOKELINE SubType 1 and a CLUD64 SubType 6 riding him.
  it('smoke the Ghost Napin green', () => {
    expect(rows(448, 'puff')).toEqual([
      {
        kind: 'puff',
        every: 1,
        bones: [21, 37, 65, 66, 77, 78, 79],
        particles: [['smokeLine1_1', 'smokeLine2_1', 'smokeLine3_1'], 'clud64_6'],
        colour: [0.4, 1, 0.4],
        ride: 'body',
      },
    ]);
  });
});

describe('blend meshes of their own', () => {
  // MONSTER_VALKYRIE (ZzzCharacter.cpp:13798-13805), not the Silver Valkyrie on the same body (:13768-13773);
  // MONSTER_CHAOS_GOBLIN's jewel and MONSTER_ELF_LALA's wings (:14409, :14441).
  it('give the Valkyrie, the Chaos Goblin and Elf Lala their mesh', () => {
    expect([47, 52, 238, 242].map(n => monsters.def(n)?.blendMesh)).toEqual([{ mesh: 0 }, undefined, { mesh: 1 }, { mesh: 1 }]);
  });
});

describe("the Dark Ghost's death", () => {
  // MODEL_DARK_GHOST's Die (GMEmpireGuardian2.cpp:942-960): to frame 3 a MODEL_SKILL_INFERNO SubType 9 a tick, to
  // frame 0.2 the two MODEL_TWINTAIL_EFFECT clouds.
  it('stages its inferno and twin-tail clouds', () => {
    expect(rows(515, 'call').map(r => [r.every, r.gate])).toEqual([
      [1, { action: [A.Die], frames: [[0, 3]] }],
      [1, { action: [A.Die], frames: [[0, 0.2]] }],
    ]);
  });
});

describe('event cues', () => {
  // MODEL_DARK_ELF_1 (GMCrywolf1st.cpp:844-866): once Crywolf reaches START (`Dark_Elf_Check`), at bone 27 a
  // BITMAP_CRATER SubType 2, two BITMAP_BLUE_BLUR SubType 1 and five BITMAP_SHOCK_WAVE SubType 8 in (1, 0.2, 0.2).
  it("burst the Dark Elf's crater and shock waves when Crywolf starts", () => {
    const fx = (monsters.def(340)?.bodyFx ?? []).filter(e => 'gate' in e && e.gate && 'cue' in e.gate);
    expect(fx.map(e => [e.kind, 'ground' in e ? `${e.ground} x${e.count}` : 'particles' in e ? e.particles.join(',') : ''])).toEqual([
      ['ground', 'crater2 x1'],
      ['puff', 'blueBlur1,blueBlur1'],
      ['ground', 'shockWave8 x5'],
    ]);
    expect(fx.every(e => 'bones' in e && e.bones.join() === '27' && e.gate?.cue === 'crywolfStart')).toBe(true);
  });
});
