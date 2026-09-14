import { Quaternion } from '../../libs/babylon/exports';
import { angleLinkMatrix } from '../../common/boneLink';
import { devQuery, devQueryNumbers } from '../../common/devSeams';
import { instrumentById, isInstrumentId } from '../../common/instruments';
import { loadGLTF } from '../../common/modelLoader';
import { ModelObject } from '../../common/modelObject';
import { isStandingIdle } from '../../common/playerActionMapper';
import type { PlayerObject } from '../../common/playerObject';
import {
  performanceEnded,
  refused,
  takenOut,
} from '../../common/band';
import { startPerforming, stopPerforming } from '../../common/band/performing';
import { audioNow, dropPerformer, setPerformerPosition } from '../../sound/instruments';
import { playUiSound } from '../../libs/sfx';
import type { Entity, ISystemFactory } from '../world';

/**
 * Performers: the hero with an instrument out, and every player in scope the
 * proxy says is playing. Holds the row's clip on them, hangs the model on
 * the hand bone, twitches a bone on every note, and ends the performance
 * the moment they step, get hit into another clip, or die.
 *
 * Before `AnimationSystem`, like `EmoteSystem`: it writes
 * `playerAnimation.action`, and the animation pass reads it after. The
 * twitch is applied on `scene.onAfterAnimationsObservable` instead, because
 * Babylon evaluates the clips inside `scene.render()` and would overwrite a
 * bone written here (the head-tracking precedent).
 */

// ---- 1. tuning -------------------------------------------------------------

/** Seconds one hit's twitch lasts. */
const TWITCH_SECONDS = 0.08;

const DEG = Math.PI / 180;

/** Dev seams: `?instRot=x,y,z` / `?instOff=x,y,z` (BMD deg / cm) and `?twitchAxis=x,y,z`. */
const rotDev = devQueryNumbers('instRot', 3);
const offDev = devQueryNumbers('instOff', 3);
const twitchAxisDev = devQueryNumbers('twitchAxis', 3);
/** `?band=<id>`: the offline scene takes the instrument out by itself. */
const bandDev = devQuery('band');

// ---- 2. the system ---------------------------------------------------------

const tmpQ = new Quaternion();

/** A live-tuned link (dev only), used for the hero's next attach. */
let linkOverride: { angle: [number, number, number]; offset: [number, number, number] } | null = null;

export const BandSystem: ISystemFactory = world => {
  const performers = world.with('performing', 'modelObject', 'transform', 'playerAnimation');
  let observed = false;

  function keyOf(e: Entity): string {
    return e.performing?.local ? 'hero' : `net:${e.netId ?? -1}`;
  }

  function attachModel(e: Entity): void {
    const p = e.performing;
    const player = e.modelObject as PlayerObject | undefined;
    if (!p || !player?.node) return;
    const def = instrumentById(p.instrument);
    const model = new ModelObject(world.scene, player.node);
    model.NodeNamePrefix = 'Instrument_';
    model.setParent(player);
    model.LinkParent = false;
    model.SkipBoundingBox = true;
    model.CurrentAction = -1;
    const live = p.local ? linkOverride : null;
    model.setBoneLink(
      def.bone,
      angleLinkMatrix({
        angle: live?.angle ?? (rotDev as [number, number, number] | null) ?? def.link.angle,
        offset: live?.offset ?? (offDev as [number, number, number] | null) ?? def.link.offset,
      })
    );
    p.model = model;

    const seq = ++model.loadSeq;
    void loadGLTF(def.model, world).then(gltf => {
      if (seq !== model.loadSeq || e.performing?.model !== model) return;
      model.load(gltf);
      for (const mesh of model.getMeshes(true)) {
        mesh.isPickable = false;
        mesh.metadata ??= {};
        mesh.metadata.timeOffset = 0;
      }
    });
  }

  function detachModel(e: Entity, model: ModelObject | null): void {
    if (!model) return;
    model.loadSeq++;
    const player = e.modelObject;
    if (player) {
      const i = player.Children.indexOf(model);
      if (i >= 0) player.Children.splice(i, 1);
    }
    model.dispose();
  }

  performers.onEntityRemoved.subscribe(e => {
    // miniplex hands the entity over while the component is still on it.
    const p = e.performing;
    detachModel(e, p?.model ?? null);
    if (p) p.model = null;
    dropPerformer(keyOf(e));
  });

  function applyTwitch(): void {
    for (const e of performers) {
      const p = e.performing;
      if (p.twitch <= 0) continue;
      const def = instrumentById(p.instrument);
      const bone = e.modelObject.gltf?.skeleton?.bones[def.twitch.bone + 1];
      const node = bone?.getTransformNode();
      if (!node?.rotationQuaternion) continue;
      const t = 1 - p.twitch / TWITCH_SECONDS;
      const a = Math.sin(Math.PI * t) * def.twitch.degrees * DEG;
      const [ax, ay, az] = twitchAxisDev ?? def.twitch.axis;
      Quaternion.FromEulerAnglesToRef(ax * a, ay * a, az * a, tmpQ);
      node.rotationQuaternion.multiplyInPlace(tmpQ);
    }
  }

  function handleRequest(): void {
    const request = world.bandRequest;
    if (!request) return;
    world.bandRequest = null;

    const hero = world.playerEntity;
    if (!hero) return;

    if (request.kind === 'putAway') {
      if (hero.performing) {
        stopPerforming(world, hero);
        performanceEnded();
      }
      return;
    }

    const velocity = hero.movement?.velocity;
    const moving = !!velocity && (velocity.x !== 0 || velocity.y !== 0);
    const idle = isStandingIdle(hero.playerAnimation.action) || !!hero.performing;
    if (hero.dying || moving || !idle) {
      playUiSound('error');
      refused('instrument.needStanding');
      return;
    }

    startPerforming(world, hero, request.instrument, true);
    takenOut(request.instrument);
  }

  let devTakeOut = bandDev && isInstrumentId(bandDev) ? bandDev : null;

  // Dev hook for tuning a row's link live: `__bandLink([90,0,0], [0,-8,-25])`
  // rebuilds the hero's instrument on the bone with that angle and offset.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as unknown as { __bandLink: unknown }).__bandLink = (
      angle: [number, number, number],
      offset: [number, number, number]
    ) => {
      const hero = world.playerEntity;
      const p = hero?.performing;
      if (!hero || !p) return false;
      linkOverride = { angle, offset };
      detachModel(hero, p.model);
      p.model = null;
      return true;
    };
  }

  return {
    update: dt => {
      if (!observed) {
        observed = true;
        world.scene.onAfterAnimationsObservable.add(applyTwitch);
      }

      if (devTakeOut && world.playerEntity?.modelObject?.gltf) {
        world.bandRequest = { kind: 'takeOut', instrument: devTakeOut };
        devTakeOut = null;
      }

      handleRequest();

      const now = audioNow();
      for (const e of performers) {
        const p = e.performing;
        const velocity = e.movement?.velocity;
        const moving = !!velocity && (velocity.x !== 0 || velocity.y !== 0);

        if (moving || e.dying || (p.local && e.playerAnimation.action !== p.clip)) {
          // A step, death, or - for the hero - an attack or skill that took
          // the clip: the performance is over. A remote performer's clip is
          // ours to hold; their own client sends the stop.
          stopPerforming(world, e);
          if (p.local) performanceEnded();
          continue;
        }

        e.playerAnimation.action = p.clip;

        p.twitch = Math.max(0, p.twitch - dt);
        const hits = p.hits;
        while (hits.length && hits[0] <= now + dt) {
          hits.shift();
          p.twitch = TWITCH_SECONDS;
        }

        setPerformerPosition(keyOf(e), e.transform.pos.x, e.transform.pos.z, p.local);

        if (!p.model && e.modelObject.gltf?.skeleton) attachModel(e);
      }
    },
  };
};
