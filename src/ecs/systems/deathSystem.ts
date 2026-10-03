import { Vector3 } from '../../controllers/render/babylon/exports';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import { BloodDecals } from '../../controllers/fx/bloodDecals';
import { shatterDeathFor, spawnBomb } from '../../controllers/fx/deathVisuals';
import { monsterModelTypeOf } from '../../controllers/anim/playSpeed';
import { inBloodCastle, inChaosCastle } from '../../controllers/actors/locomotion';
import { TW_ACTION, TW_NOGROUND } from '../../controllers/terrain/consts';
import { playSfx } from '../../controllers/sound/sfx';
import { COMBAT_BUS } from '../../controllers/sound/combatSounds';
import { entityYaw, type RGB } from '../../controllers/fx/core';
import { combat } from '../../controllers/combat';
import type { DeathMotion, Entity, ISystemFactory } from '../world';
import type { PlayerObject } from '../../controllers/actors/playerObject';

/**
 * DeadCharacter / SetPlayerDie / the Dead counter (ZzzCharacter.cpp:3105,
 * 1372, 3958, 3014, 3145-3193; WSclient.cpp:5370, 5440, 5489). See ecs/readme.md.
 */

const TICKS_PER_SECOND = 25;
/** `c->Dead >= 15` -> SetPlayerDie (ZzzCharacter.cpp:4074-4080): Dead starts at 1, so 14 ticks after the kill. */
const DIE_TICKS = 14;
const ROT_PER_TICK = 0.02;
const SINK_PER_TICK = 0.4 / 100; // 0.4 in the original's cm units
const HEAD_BONE = 20;
const CM = 1 / 100;
const DEG = Math.PI / 180;

// ---- the skill knock (Nova, Combo: ZzzCharacter.cpp:3173-3193, WSclient.cpp:5527-5546)
/** `c->Dead < 15`: ticks the slide lasts. */
const KNOCK_TICKS = 15;
/** `Direction[1] = rand() % 15 + 40` cm/tick. */
const KNOCK_SPEED_CM_MIN = 40;
const KNOCK_SPEED_CM_SPAN = 15;
/** `Velocity = (rand() % 5 + 10) * 0.1`, `+= 1` a tick. */
const KNOCK_DECEL_MIN = 1.0;
const KNOCK_DECEL_SPAN = 0.5;
const KNOCK_DECEL_PER_TICK = 1;

// ---- castle falls (WSclient.cpp:5440-5487, ZzzCharacter.cpp:3014-3032)
/** `Gravity = rand() % 10 + 10` (cm, the initial hop up). */
const FALL_HOP_CM_MIN = 10;
const FALL_HOP_CM_SPAN = 10;
/** Pit: `Velocity -= rand() % 3 + 3`, `Direction = (0, 0, 1)`. */
const PIT_VY_MIN = 3;
const PIT_VY_SPAN = 3;
const PIT_DROP = 1;
/** Bridge: `Velocity = rand() % 20 + 20`, `Direction = (rand()%6+8, 13-rand()%2, 5)`. */
const BRIDGE_VY_MIN = 20;
const BRIDGE_VY_SPAN = 20;
const BRIDGE_ACCEL_MIN = 8;
const BRIDGE_ACCEL_SPAN = 6;
const BRIDGE_SPEED_MIN = 12;
const BRIDGE_SPEED_SPAN = 2;
const BRIDGE_DROP = 5;
/** `Angle[0] -= 5` a tick: the body tips over as it falls. */
const FALL_TIP_DEG_PER_TICK = 5;
/** Chaos Castle bombs: on odd ticks in `[start - 10, start]`, start 25 (15 while falling). */
const BOMB_START_TICK = 25;
const BOMB_START_TICK_FALLING = 15;
const BOMB_WINDOW_TICKS = 10;
/** `rand() % 160 - 80` cm around the body, `+ 50` up. */
const BOMB_SPREAD_CM = 80;
const BOMB_RAISE_CM = 50;
/** `SOUND_EXPLOTION01` (1 channel, ZzzOpenData.cpp:4813): every BITMAP_EXPLOTION
 *  plays it with no object, so 2D (ZzzEffectParticle.cpp:2482). */
const BOMB_SOUND = 'Sound/eExplosion';
const BOMB_SOUND_CHANNELS = 1;
/** `SOUND_CHAOS_FALLING` (pMaleScream, 1 channel, not 3D; ZzzOpenData.cpp:4868),
 *  played with no object (WSclient.cpp:5885). */
const PIT_SCREAM = 'Sound/pMaleScream';
const PIT_SCREAM_CHANNELS = 1;

const tmpHead = new Vector3();
const tmpBomb = new Vector3();

export const DeathSystem: ISystemFactory = world => {
  const query = world.with('dying', 'modelObject', 'transform');
  let blood: BloodDecals | null = null;

  /** Body origin in map-local tiles (what `o->Position` is to an effect). */
  function bodyOrigin(e: Entity, out: Vector3): Vector3 {
    const t = e.transform!;
    return out.set(
      t.pos.x + (t.posOffset?.x ?? 0),
      t.pos.y,
      t.pos.z + (t.posOffset?.z ?? 0)
    );
  }

  /** `ReceiveDie`'s motion setup, once per kill packet. */
  function startMotion(e: Entity): DeathMotion | undefined {
    const d = e.dying!;
    const t = e.transform!;
    const map = world.mapIndex;
    const x = ~~t.pos.x;
    const y = ~~t.pos.z;
    if (inChaosCastle(map) && world.getTerrainFlag(x, y) & TW_NOGROUND) {
      playSfx(PIT_SCREAM, null, { bus: COMBAT_BUS, channels: PIT_SCREAM_CHANNELS });
      return {
        kind: 'fall',
        side: 0,
        accel: 0,
        speed: 0,
        height: FALL_HOP_CM_MIN + Math.random() * FALL_HOP_CM_SPAN,
        vy: -(PIT_VY_MIN + Math.random() * PIT_VY_SPAN),
        drop: PIT_DROP,
      };
    }
    if (inBloodCastle(map) && world.getTerrainFlag(x, y) & TW_ACTION) {
      const side =
        world.getTerrainFlag(x + 1, y) & TW_NOGROUND
          ? 1
          : world.getTerrainFlag(x - 1, y) & TW_NOGROUND
            ? -1
            : 0;
      return {
        kind: 'fall',
        side,
        accel: BRIDGE_ACCEL_MIN + Math.random() * BRIDGE_ACCEL_SPAN,
        speed: BRIDGE_SPEED_MIN + Math.random() * BRIDGE_SPEED_SPAN,
        height: FALL_HOP_CM_MIN + Math.random() * FALL_HOP_CM_SPAN,
        vy: BRIDGE_VY_MIN + Math.random() * BRIDGE_VY_SPAN,
        drop: BRIDGE_DROP,
      };
    }
    if (inBloodCastle(map) || inChaosCastle(map)) return undefined;
    // A skill whose kill knocks the body back (its file's `kill.knock`).
    if (combat.skillKill(d.skill)?.knock) {
      // Face the killer (`CreateAngle2D(o->Position, to->Position)`); the
      // slide runs along that heading. Without the killer in scope: own yaw.
      const killer = world.getByNetId(d.killerNetId);
      let dirX: number;
      let dirZ: number;
      if (killer?.transform) {
        dirX = killer.transform.pos.x - t.pos.x;
        dirZ = killer.transform.pos.z - t.pos.z;
        const len = Math.hypot(dirX, dirZ) || 1;
        dirX /= len;
        dirZ /= len;
      } else {
        const yaw = entityYaw(e);
        dirX = Math.sin(yaw);
        dirZ = -Math.cos(yaw);
      }
      return {
        kind: 'knock',
        dirX,
        dirZ,
        speed: KNOCK_SPEED_CM_MIN + Math.random() * KNOCK_SPEED_CM_SPAN,
        decel: KNOCK_DECEL_MIN + Math.random() * KNOCK_DECEL_SPAN,
      };
    }
    return undefined;
  }

  /** One 25 Hz tick of the body motion; `tick` is the Dead counter after it. */
  function stepMotion(e: Entity, m: DeathMotion, tick: number): void {
    const d = e.dying!;
    if (m.kind === 'knock') {
      if (tick >= KNOCK_TICKS) return;
      m.speed = Math.max(0, m.speed - m.decel);
      m.decel += KNOCK_DECEL_PER_TICK;
      d.offset.x += m.dirX * m.speed * CM;
      d.offset.z += m.dirZ * m.speed * CM;
      return;
    }
    // FallingCharacter: Direction[1] += Direction[0]; Gravity += Velocity;
    // Velocity -= Direction[2]; Angle[0] -= 5; Position = dead + rotated slide, z = dead + Gravity.
    m.speed += m.accel;
    m.height += m.vy;
    m.vy -= m.drop;
    d.pitch -= FALL_TIP_DEG_PER_TICK * DEG;
    d.offset.x = m.side * m.speed * CM;
    d.offset.y = m.height * CM;
  }


  function chaosBombs(e: Entity, tickBefore: number, tickAfter: number): void {
    const start = e.dying!.motion?.kind === 'fall' ? BOMB_START_TICK_FALLING : BOMB_START_TICK;
    for (let tick = Math.floor(tickBefore) + 1; tick <= Math.floor(tickAfter); tick++) {
      if (tick > start || tick < start - BOMB_WINDOW_TICKS || tick % 2 === 0) continue;
      bodyOrigin(e, tmpBomb);
      tmpBomb.x += (Math.random() * 2 - 1) * BOMB_SPREAD_CM * CM;
      tmpBomb.z += (Math.random() * 2 - 1) * BOMB_SPREAD_CM * CM;
      tmpBomb.y += ((Math.random() * 2 - 1) * BOMB_SPREAD_CM + BOMB_RAISE_CM) * CM;
      spawnBomb(world.scene, tmpBomb);
      // One channel: the first bomb of a burst sounds, the rest land inside its 1 s.
      playSfx(BOMB_SOUND, null, { bus: COMBAT_BUS, channels: BOMB_SOUND_CHANNELS });
    }
  }

  function startDie(e: Entity) {
    const d = e.dying!;
    const model = e.modelObject!;

    // SetPlayerDie's switch: a shatter death replaces the Die clip and the
    // blood - the body is gone (`o->Live = false`) and the pieces fly.
    const shatter = e.monsterAnimation
      ? shatterDeathFor(monsterModelTypeOf(e.npcType))
      : ((model.constructor as typeof PlayerObject).DeathShatter ?? undefined);
    if (shatter) {
      const light: RGB = [model.Light.x, model.Light.y, model.Light.z];
      bodyOrigin(e, tmpHead);
      shatter.spawn(world.scene, tmpHead, light);
      if (shatter.sound) {
        playSfx(shatter.sound, { x: tmpHead.x, z: tmpHead.z }, { bus: COMBAT_BUS });
      }
      model.setAlpha(0);
      d.alpha = 0;
      d.shattered = true;
      return;
    }

    if (e.monsterAnimation) {
      e.monsterAnimation.action = MonsterActionType.Die;
    } else if (e.playerAnimation) {
      e.playerAnimation.action = PlayerAction.PLAYER_DIE1;
    }

    // CreateBlood at the head bone (falls back to the body origin).
    const transform = e.transform!;
    const bone = model.gltf?.skeleton?.bones[HEAD_BONE + 1];
    const node = bone?.getTransformNode();
    if (node) {
      tmpHead.copyFrom(node.getAbsolutePosition());
      tmpHead.x -= world.mapParent.position.x;
      tmpHead.z -= world.mapParent.position.z;
    } else {
      tmpHead.set(
        transform.pos.x + (transform.posOffset?.x ?? 0),
        transform.pos.y,
        transform.pos.z + (transform.posOffset?.z ?? 0)
      );
    }
    if (!blood) blood = new BloodDecals(world);
    blood.spawn(tmpHead, model.Light);
  }

  return {
    update: dt => {
      const ticks = dt * TICKS_PER_SECOND;
      blood?.update(dt);

      for (const e of query) {
        const d = e.dying;
        const model = e.modelObject;
        // `c->Dead += FPS_ANIMATION_FACTOR` (ZzzCharacter.cpp:4076): whole ticks at 25 fps, no float drift.
        const tickBefore = d.time;
        d.time += ticks;
        const tickAfter = d.time;

        // ReceiveDie's motion setup runs on the kill tick, before the Die clip.
        if (tickBefore === 0) d.motion = startMotion(e);
        if (d.motion) {
          for (let tick = Math.floor(tickBefore) + 1; tick <= Math.floor(tickAfter); tick++) {
            stepMotion(e, d.motion, tick);
          }
        }
        // What the killing skill draws on the body while it dies (Nova's glow).
        combat.skillKill(d.skill)?.dying?.(e, ticks, tickAfter, world);
        if (inChaosCastle(world.mapIndex)) chaosBombs(e, tickBefore, tickAfter);

        // DeadCharacter's `c->Rot += 0.02` runs from the kill on, Die clip or not (ZzzCharacter.cpp:3215-3229).
        d.rot += ROT_PER_TICK * ticks;

        if (!d.started) {
          // A Blood Castle bridge fall dies at once (`m_bActionStart`, :4081-4084); `held` is the hero's blow wait.
          const bridgeFall = d.motion?.kind === 'fall' && inBloodCastle(world.mapIndex);
          if (model.Ready && d.time >= (bridgeFall ? 0 : DIE_TICKS - d.held)) {
            d.started = true;
            startDie(e);
          }
          continue;
        }

        if (d.shattered) {
          // `o->Live = false`: nothing left to fade; the pieces are the effects layer's.
          if (!e.localPlayer && !e.objOutOfScope) {
            world.addComponent(e, 'objOutOfScope', true);
          }
          continue;
        }

        if (d.rot >= 1) {
          d.alpha = Math.max(0, 1 - (d.rot - 1));
          model.setAlpha(d.alpha);
          if (d.alpha >= 0.01) {
            d.sink += SINK_PER_TICK * ticks;
          } else if (!e.localPlayer && !e.objOutOfScope) {
            world.addComponent(e, 'objOutOfScope', true);
          }
        }
      }
    },
  };
};
