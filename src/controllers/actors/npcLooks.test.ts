import { beforeAll, describe, expect, it } from 'vitest';
import { monsterRegistry } from '@/controllers/monsters';
import { CharacterClassNumber } from '@/core/types';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';

/** NPCs drawn as the original client draws them, checked on the class `resolveModelFactory` hands out. */
async function load() {
  const resolve = await import('./modelFactoryPerId');
  const { gearedNpcFactory } = await import('./playerNpc');
  const { npcHeroStateOf } = await import('./playerObject');
  await import('@versions/shared/monsters/models');
  return { ...resolve, gearedNpcFactory, npcHeroStateOf };
}

let m: Awaited<ReturnType<typeof load>>;
/** A folder's own idle roll (EtcStopAnimationSetting), part of the class it is drawn with. */
const idleOf = (type: number) => monsterRegistry.def(type)?.npcModel?.idle;

beforeAll(async () => {
  m = await load();
}, 120_000);

describe('NPC looks from the original client', () => {
  it('Hanzo the Blacksmith draws Smith01 at 0.95 (ZzzCharacter.cpp:14517-14522)', () => {
    expect(m.resolveModelFactory(251)).toBe(m.npcFactoryFor('Smith01', 0.95, {}, undefined, idleOf(251)));
  });

  // OpenNpc + CreateCharacter and nothing else (ZzzCharacter.cpp:14295-14299, :14415-14418, :14531-14535).
  it.each([
    [226, 'Breeder'],
    [240, 'Storage01'],
    [254, 'Wizard01'],
  ])('%i is a plain NPC model (%s) with no class of its own', (type, file) => {
    expect(m.resolveModelFactory(type)).toBe(m.npcFactoryFor(file, undefined, undefined, undefined, idleOf(type)));
  });

  // CreateCharacterPointer's `o->Scale = 0.9f` (ZzzCharacter.cpp:11699), kept by every case that sets
  // none; SetCharacterScale gives the CLASS_WIZARD rig the same 0.9 (:12144).
  it.each([
    226, 231, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 254, 256, 259, 369, 370, 380, 406, 478, 567, // plain models
    204, 216, 217, 218, // Wolf Statue, Crown and its switches
    230, 248, 250, 253, 255, // the rig-only classes
    229, 247, 249, 258, 371, 414, 375, 464, 34, // SetCharacterScale on a geared rig
    503, 548, // the transformed Panda and Skeleton
    100, 101, 102, 103, 104, 106, // traps
  ])('%i spawns at the default 0.9', type => {
    expect(m.npcSpawnScale(m.resolveModelFactory(type))).toBe(0.9);
  });

  // `if (gMapManager.InDevilSquare()) c->Object.Scale = 1.0f` (ZzzCharacter.cpp:13927-13930); map 32 is
  // Devil Square 5-7, which the original loads as WD_9DEVILSQUARE.
  it('the Cursed Wizard spawns at 1 in Devil Square and 0.9 elsewhere', () => {
    const f = m.resolveModelFactory(34);
    expect([9, 32, 0, 2].map(world => m.npcSpawnScale(f, 34, world))).toEqual([1, 1, 0.9, 0.9]);
  });

  // Setting_Monster: types 84-143 grow `int(nCastle / 3) * 0.05` in Blood Castle, nCastle = 8 + world - 17
  // (ZzzCharacter.cpp:13150-13159): 0 on floor 1, 0.05 on 2-4, 0.1 on 5-7; nothing on the master castle (52).
  it('the Blood Castle line grows with the castle floor', () => {
    const at = (type: number, world: number) => m.npcSpawnScale(m.resolveModelFactory(type), type, world);
    const worlds = [11, 12, 13, 14, 15, 16, 17, 52, 0];
    const grow = [0, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0, 0];
    for (const type of [84, 89, 143]) {
      const base = at(type, 0);
      worlds.forEach((w, i) => expect(at(type, w)).toBeCloseTo(base + grow[i], 6));
    }
    // Outside 84-143 nothing changes.
    expect(at(83, 17)).toBe(at(83, 0));
    expect(at(144, 17)).toBe(at(144, 0));
  });

  it.each([
    [11, 0.9], // Ghost: no Scale in its case (ZzzCharacter.cpp:14098-14105)
    [17, 0.9], // Cyclops (:14060-14067)
    [22, 0.9], // Ice Monster (:14020-14026)
    [24, 0.9], // Worm (:14007-14011)
    [32, 0.9], // Stone Golem (:13949-13953)
    ...[161, 181, 189, 197, 267, 338].map(t => [t, 1.5]), // Illusion of Kundun 1-6 (GMHellas.cpp:897-912)
    [502, 0.95], // Golden Rabbit, `1.0f * 0.95f` (:14865)
    [515, 1.3], // Dark Ghost (GMEmpireGuardian2.cpp:94)
  ])('monster %i spawns at the scale its case sets, %f', (type, scale) => {
    expect(m.npcSpawnScale(m.resolveModelFactory(type))).toBeCloseTo(scale, 6);
  });

  it.each([
    [236, 1], // Golden Archer, :14387
    [257, 1], // Elf Soldier, MakeElfHelper :12469
    [297, 0.93], // PK Dark Knight: Skin = 1 (GMHuntingGround.cpp:291), SetCharacterScale :12157
    [251, 0.95], // Hanzo
    [232, 1], // Archangel
    [105, 1], // Cannon Trap (GM_Kanturu_2nd.cpp:1422)
    [535, 1], // Doppelganger Knight
  ])('%i spawns at its own %f', (type, scale) => {
    expect(m.npcSpawnScale(m.resolveModelFactory(type))).toBe(scale);
  });

  it('Zyro wears the Moss model at 0.8, as Moss does (ZzzCharacter.cpp:14505-14516, :14846-14860)', () => {
    const speeds = { 0: 0.33, 1: 0.33, 2: 0.33, 3: 0.33, 4: 0.33, 5: 0.33 };
    expect(m.resolveModelFactory(568)).toBe(m.npcFactoryFor('gambler_moss', 0.8, speeds, undefined, idleOf(568)));
    expect(m.resolveModelFactory(568)).toBe(m.resolveModelFactory(492));
  });

  // MODEL_WARCRAFT (HellGate, one clip of 11 keys) spawns on frame 10; at its clip's end EtcStopAnimationSetting
  // sets action 1, which it has not, so PlayAnimation stops advancing and AnimationFrame stays the 8 it is
  // given (ZzzCharacter.cpp:13333-13334, :3504-3506, :3737-3740; ZzzBMD.cpp:742). The pose drawn blends the
  // prior key into the current one by the fraction, 0 at 8.0, and the prior key is the 10 it left
  // (ZzzBMD.cpp:146-149, :259-264): key 10 is all it ever shows.
  it('the Kalima gates hold their portal on key 10, never playing the clip', () => {
    const scene = new Scene(new NullEngine());
    for (let type = 152; type <= 158; type++) {
      const gate = new (m.resolveModelFactory(type))(scene);
      const root = new Mesh('gate', scene);
      const opening = new Animation('open', 'position.x', 25, Animation.ANIMATIONTYPE_FLOAT);
      opening.setKeys(Array.from({ length: 11 }, (_, k) => ({ frame: 5 * k, value: k })));
      const clip = new AnimationGroup('hellgate_action_0', scene);
      clip.addTargetedAnimation(opening, root);
      // loadGLTF hands every model out with clip 0 looping.
      clip.start(true);
      gate.load({ mesh: root, skeleton: new Skeleton('gate', 'gate', scene), animationGroups: [clip] });
      // The monster loop asks for Stop1 every frame.
      gate.playAction(0, true);
      expect(clip.isPlaying).toBe(false);
      expect(clip.animatables[0]?.masterFrame).toBe(50);
    }
    scene.getEngine().dispose();
  });

  // RenderCharacter skips these monsters and every trap (KIND_TRAP, 100-110) in its shadow pass (ZzzCharacter.cpp:8662-8668, :13138-13141).
  it('the monsters and traps the original casts no shadow for', () => {
    const none = [22, 25, 42, 59, 63, 152, 242, 100, 104, 105, 106];
    expect(none.filter(type => m.npcClassicShadow(type))).toEqual([]);
    expect([3, 26, 153].filter(type => m.npcClassicShadow(type))).toEqual([3, 26, 153]);
  });

  // `o->Alpha >= 0.3f` opens a monster's shadow pass (ZzzCharacter.cpp:8673); a player-rig NPC takes the player's.
  it('a monster draws its shadow from 0.3 alpha', () => {
    const scene = new Scene(new NullEngine());
    const monster = new (m.resolveModelFactory(3))(scene);
    m.applyNpcShadow(monster, 3);
    expect([monster.ShadowMinAlpha, monster.ClassicShadow]).toEqual([0.3, true]);
    const queen = new (m.resolveModelFactory(25))(scene);
    m.applyNpcShadow(queen, 25);
    expect(queen.ClassicShadow).toBe(false);
    scene.getEngine().dispose();
  });

  // `m_bRenderShadow = false` at creation (ZzzCharacter.cpp:13584-14730, w_CursedTemple.cpp:170 and the
  // GMBattleCastle, GMDoppelGanger1, GMEmpireGuardian1/4, GM_Kanturu_2nd, GM_Raklion cases), and every frame on
  // the Maya hands (GM_Kanturu_3rd.cpp:1091, :1154).
  it('the NPCs the original creates with no shadow', () => {
    const none = [70, 368, 379, 408, 451, 380, 215, 216, 221, 222, 277, 278, 283, 285, 288, 533, 524, 525, 526, 527, 528, 367, 460, 461, 462, 362, 363];
    expect(none.filter(type => m.npcClassicShadow(type))).toEqual([]);
  });

  // The Die branch sets `m_bRenderShadow = false` (GMEmpireGuardian2.cpp:945, GMKarutan1.cpp:461, :534,
  // GMNewTown.cpp:1057, GMSwampOfQuiet.cpp:859-1207, GM_Kanturu_1st.cpp:986, GM_Kanturu_2nd.cpp:996,
  // GM_PK_Field.cpp:701, GM_Raklion.cpp:1830, :2086, ZzzObject.cpp:1833).
  it('the monsters that lose their shadow when they die', () => {
    const alive = [515, 575, 576, 423, 444, 445, 446, 561, 559, 354, 498, 359, 486, 487, 488, 456, 563, 477];
    expect(alive.filter(type => m.npcShadowOnDeath(type) || !m.npcClassicShadow(type))).toEqual([]);
    expect(m.npcShadowOnDeath(3)).toBe(true);
  });

  // `Models[MODEL_GAMBLE_NPC_MOSS].Actions[0..5].PlaySpeed = 0.33f` (ZzzCharacter.cpp:14512-14515, :14855-14858).
  it('Moss and Zyro play their six clips at 0.33', () => {
    const scene = new Scene(new NullEngine());
    for (const type of [492, 568]) {
      const npc = new (m.resolveModelFactory(type))(scene);
      expect([0, 1, 2, 3, 4, 5, 6].map(a => npc.actionPlaySpeed(a))).toEqual([...Array(6).fill(0.33), undefined]);
    }
    scene.getEngine().dispose();
  });

  // CreateCharacter(MODEL_PLAYER) leaves c->Class = CLASS_WIZARD (ZzzCharacter.cpp:11732-11735).
  it('the Cursed Wizard wears Legendary +9, staff and shield, on a wizard rig (ZzzCharacter.cpp:13907-13931)', () => {
    const gear = monsterRegistry.def(34)?.gear;
    expect(gear).toMatchObject({
      charClass: CharacterClassNumber.DarkWizard,
      set: 3,
      level: 9,
      mainHand: { group: 5, num: 5 },
      offHand: { group: 6, num: 14 },
    });
    expect(m.resolveModelFactory(34)).toBe(m.gearedNpcFactory(gear!));
  });

  // `c->PK = PVP_MURDERER2` (ZzzCharacter.cpp:13925, GMHuntingGround.cpp:305) draws the body red (:9988-9991).
  it('the Cursed Wizard and the PK Dark Knight spawn as outlaws; the guards do not', () => {
    expect([34, 297, 229, 247, 240].map(t => m.npcHeroStateOf(m.resolveModelFactory(t)))).toEqual([6, 6, null, null, null]);
  });

  it('Luke, Leo and Ellen are one plate-rig case (ZzzCharacter.cpp:14612-14625)', () => {
    expect(m.resolveModelFactory(371)).toBe(m.resolveModelFactory(258));
    expect(m.resolveModelFactory(414)).toBe(m.resolveModelFactory(258));
  });
});
