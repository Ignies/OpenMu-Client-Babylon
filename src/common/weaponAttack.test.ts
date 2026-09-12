import { describe, expect, it } from 'vitest';
import { BaseClass } from './characterStats';
import { PlayerAction as A } from './objects/enum';
import {
  chooseAttackAction,
  chooseHighBowAttackAction,
  type AttackPose,
} from './weaponClass';
import type { Item } from '../ecs/world';

const item = (group: number, num: number): Item => ({ group, num, lvl: 0 }) as Item;

// Slot 0 ("leftHand") is Weapon[0], the main hand.
const pose = (
  main: Item | null,
  off: Item | null = null,
  extra: Partial<AttackPose> = {}
): AttackPose => ({
  hands: { leftHand: main, rightHand: off } as AttackPose['hands'],
  baseClass: BaseClass.Knight,
  swordCount: 0,
  ...extra,
});

/** The clips a weapon produces over four consecutive swings. */
function cycle(p: Omit<AttackPose, 'swordCount'>, count = 4): A[] {
  return Array.from({ length: count }, (_, n) =>
    chooseAttackAction({ ...p, swordCount: n })
  );
}

const SHORT_SWORD = item(0, 0);
const DARK_REIGN_BLADE = item(0, 21); // two-handed, and one of the four "TWO" blades
const GREAT_AXE = item(1, 6); // two-handed
const SPEAR = item(3, 1); // MODEL__SPEAR
const DRAGON_LANCE = item(3, 2);
const SCYTHE = item(3, 3);
const DOUBLE_POLEAXE = item(3, 5);
const BOW = item(4, 0);
const CROSSBOW = item(4, 8);
const ARROWS = item(4, 15);
const SMALL_AXE = item(1, 0); // one-handed
const SKULL_STAFF = item(5, 0); // one-handed
const RESURRECTION_STAFF = item(5, 6); // two-handed

describe('chooseAttackAction', () => {
  it('swings bare fists with nothing equipped', () => {
    expect(chooseAttackAction(pose(null))).toBe(A.PLAYER_ATTACK_FIST);
  });

  it('alternates the two right-hand swings with one one-hander', () => {
    expect(cycle(pose(SHORT_SWORD))).toEqual([
      A.PLAYER_ATTACK_SWORD_RIGHT1,
      A.PLAYER_ATTACK_SWORD_RIGHT2,
      A.PLAYER_ATTACK_SWORD_RIGHT1,
      A.PLAYER_ATTACK_SWORD_RIGHT2,
    ]);
  });

  it('runs the four-clip round when a one-hander fills each hand', () => {
    expect(cycle(pose(SHORT_SWORD, SMALL_AXE))).toEqual([
      A.PLAYER_ATTACK_SWORD_RIGHT1,
      A.PLAYER_ATTACK_SWORD_LEFT1,
      A.PLAYER_ATTACK_SWORD_RIGHT2,
      A.PLAYER_ATTACK_SWORD_LEFT2,
    ]);
  });

  it('cycles three two-hand swings, not one', () => {
    expect(cycle(pose(GREAT_AXE))).toEqual([
      A.PLAYER_ATTACK_TWO_HAND_SWORD1,
      A.PLAYER_ATTACK_TWO_HAND_SWORD2,
      A.PLAYER_ATTACK_TWO_HAND_SWORD3,
      A.PLAYER_ATTACK_TWO_HAND_SWORD1,
    ]);
  });

  it('gives the four special blades their own swing', () => {
    expect(cycle(pose(DARK_REIGN_BLADE))).toEqual(
      Array(4).fill(A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO)
    );
  });

  it('thrusts only with the Spear and the Dragon Lance', () => {
    expect(chooseAttackAction(pose(SPEAR))).toBe(A.PLAYER_ATTACK_SPEAR1);
    expect(chooseAttackAction(pose(DRAGON_LANCE))).toBe(A.PLAYER_ATTACK_SPEAR1);
  });

  it('cycles three scythe swings for the rest of the spear group', () => {
    expect(cycle(pose(SCYTHE))).toEqual([
      A.PLAYER_ATTACK_SCYTHE1,
      A.PLAYER_ATTACK_SCYTHE2,
      A.PLAYER_ATTACK_SCYTHE3,
      A.PLAYER_ATTACK_SCYTHE1,
    ]);
    expect(chooseAttackAction(pose(DOUBLE_POLEAXE, null, { swordCount: 1 }))).toBe(
      A.PLAYER_ATTACK_SCYTHE2
    );
  });

  it('casts with a two-handed staff and swings with a one-handed one', () => {
    const twoHand = new Set([A.PLAYER_SKILL_WEAPON1, A.PLAYER_SKILL_WEAPON2]);
    const oneHand = new Set([A.PLAYER_ATTACK_SWORD_RIGHT1, A.PLAYER_ATTACK_SWORD_RIGHT2]);
    for (let n = 0; n < 20; n++) {
      expect(twoHand.has(chooseAttackAction(pose(RESURRECTION_STAFF)))).toBe(true);
      expect(oneHand.has(chooseAttackAction(pose(SKULL_STAFF)))).toBe(true);
    }
  });

  it('shoots with a bow or crossbow, and flies with wings on', () => {
    expect(chooseAttackAction(pose(ARROWS, BOW))).toBe(A.PLAYER_ATTACK_BOW);
    expect(chooseAttackAction(pose(CROSSBOW, null))).toBe(A.PLAYER_ATTACK_CROSSBOW);
    expect(chooseAttackAction(pose(ARROWS, BOW, { wings: true }))).toBe(
      A.PLAYER_ATTACK_FLY_BOW
    );
    expect(chooseAttackAction(pose(CROSSBOW, null, { wings: true }))).toBe(
      A.PLAYER_ATTACK_FLY_CROSSBOW
    );
  });

  it('swaps to the mount clips, and never inside a safe zone', () => {
    expect(chooseAttackAction(pose(SHORT_SWORD, null, { mount: 'horse' }))).toBe(
      A.PLAYER_ATTACK_RIDE_HORSE_SWORD
    );
    expect(chooseAttackAction(pose(GREAT_AXE, null, { mount: 'dinorant' }))).toBe(
      A.PLAYER_ATTACK_RIDE_TWO_HAND_SWORD
    );
    expect(chooseAttackAction(pose(SPEAR, null, { mount: 'uniria' }))).toBe(
      A.PLAYER_ATTACK_RIDE_SPEAR
    );
    expect(chooseAttackAction(pose(DOUBLE_POLEAXE, null, { mount: 'uniria' }))).toBe(
      A.PLAYER_ATTACK_RIDE_SCYTHE
    );
    expect(chooseAttackAction(pose(SHORT_SWORD, SMALL_AXE, { mount: 'fenrir' }))).toBe(
      A.PLAYER_FENRIR_ATTACK_TWO_SWORD
    );
    // mountKind() collapses to null in a safe zone, which puts the swing
    // back on the ground clips.
    expect(chooseAttackAction(pose(SHORT_SWORD, null, { mount: null }))).toBe(
      A.PLAYER_ATTACK_SWORD_RIGHT1
    );
  });

  it("lets a Dark Lord's Fenrir sword win over the weapon ladder", () => {
    expect(
      chooseAttackAction(
        pose(ARROWS, BOW, { mount: 'fenrir', baseClass: BaseClass.DarkLord })
      )
    ).toBe(A.PLAYER_FENRIR_ATTACK_DARKLORD_SWORD);
  });
});

describe('chooseHighBowAttackAction', () => {
  it('aims up with the clip matching the launcher and the mount', () => {
    expect(chooseHighBowAttackAction(pose(ARROWS, BOW))).toBe(A.PLAYER_ATTACK_BOW_UP);
    expect(chooseHighBowAttackAction(pose(CROSSBOW, null))).toBe(
      A.PLAYER_ATTACK_CROSSBOW_UP
    );
    expect(chooseHighBowAttackAction(pose(ARROWS, BOW, { wings: true }))).toBe(
      A.PLAYER_ATTACK_FLY_BOW_UP
    );
    expect(chooseHighBowAttackAction(pose(ARROWS, BOW, { mount: 'dinorant' }))).toBe(
      A.PLAYER_ATTACK_RIDE_BOW_UP
    );
  });
});
