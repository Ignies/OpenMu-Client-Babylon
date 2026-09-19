import { MapTileObject } from '../../common/mapTileObject';
import { Rand } from '../../common/rand';
import type { Entity, World } from '../../ecs/world';

/**
 * `fSpeed = b->Actions[o->CurrentAction].PlaySpeed` (ZzzObject.cpp:3692):
 * types 16, 17 and 68 are the only map objects in the game that animate off
 * the *action's* play speed instead of `o->Velocity`. `Action_t` is
 * value-initialised (`new Action_t[n]()`, ZzzBMD.cpp:3210) and the BMD file
 * carries no `PlaySpeed`, so that field is 0 unless something writes it -
 * and the only writer for this art set is `LoadWorld`, on `WD_57ICECITY`
 * alone (MapManager.cpp:1153-1163).
 *
 * Both penguins are placed on Raklion only, so those are the rates that
 * matter: 0.8 keys a tick for the idle pair, 1.0 for type 17's two rarer
 * clips. Against the 0.16 `CreateObject` hands every other prop
 * (ZzzObject.cpp:4476) they are birds fidgeting rather than drifting.
 */
const IDLE_PLAY_SPEED = 0.8;
const RARE_PLAY_SPEED = 1;

/**
 * Raklion 16 (GM_Raklion.cpp:1077-1088), ×11 - `penguin.smd` with two idle
 * clips, `Object58/Object17.glb`.
 *
 * `if (o->AnimationFrame >= 19) SetAction(o, rand() % 2)`: every time the
 * clip runs out the penguin re-rolls which of the two it plays next,
 * including the one it just finished. Both clips are 20 keys, so the test is
 * simply "this one is over".
 *
 * Here that is a one-shot plus a re-roll on the end observer rather than a
 * frame compare: `ActionIterationWasFinished` is raised exactly where the
 * original's `AnimationFrame` crosses the last key. `restartAction` covers
 * the re-roll landing on the clip already playing - `playAction` returns
 * early on an unchanged index, and the penguin would freeze on its last
 * frame.
 */
export class RaklionPenguinObject extends MapTileObject {
  /**
   * A batched type plays one clip for every placement of it
   * (propBatches.ts:62-68); the whole point here is that each bird rolls its
   * own.
   */
  static Batchable = false;

  /** The clip to play after `finished` ended. */
  protected nextAction(_finished: number): number {
    return Rand.nextInt(0, 2);
  }

  protected playSpeedFor(_action: number): number {
    return IDLE_PLAY_SPEED;
  }

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    // `loadGLTF` has clip 0 running looped; take it over as a one-shot.
    this.#start(this.nextAction(0));
  }

  #start(action: number): void {
    this.setAnimationSpeed(this.playSpeedFor(action));

    if (action === this.CurrentAction) {
      this.LoopAction = false;
      this.restartAction();
      return;
    }

    this.playAction(action, false);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || !this.ActionIterationWasFinished) return;

    this.#start(this.nextAction(this.CurrentAction));
  }
}

/**
 * Raklion 17 (GM_Raklion.cpp:1089-1123), ×2 - the same `penguin.smd` mesh
 * with four clips, `Object58/Object18.glb`.
 *
 * From an idle, `rand() % 100` picks one of the two 20-key idles by parity
 * 90 times in 100 and one of the two long clips (2 runs to key 97, 3 to key
 * 98) the other 10. From a long clip it is `rand() % 2` and always an idle,
 * so the two never chain. Clips 2 and 3 run a fifth faster than the idles.
 */
export class RaklionPenguinBigObject extends RaklionPenguinObject {
  protected nextAction(finished: number): number {
    if (finished >= 2) return Rand.nextInt(0, 2);

    const roll = Rand.nextInt(0, 100);
    const parity = roll % 2;

    return roll < 90 ? parity : 2 + parity;
  }

  protected playSpeedFor(action: number): number {
    return action >= 2 ? RARE_PLAY_SPEED : IDLE_PLAY_SPEED;
  }
}
