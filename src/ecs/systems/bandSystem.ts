import { Vector3 } from '../../libs/babylon/exports';
import { angleLinkMatrix } from '../../common/boneLink';
import { devQuery, devQueryNumbers } from '../../common/devSeams';
import { instrumentById, isInstrumentId } from '../../common/instruments';
import { loadGLTF } from '../../common/modelLoader';
import { ModelObject } from '../../common/modelObject';
import type { PlayerAction } from '../../common/objects/enum';
import { isStandingIdle } from '../../common/playerActionMapper';
import type { PlayerObject } from '../../common/playerObject';
import {
  performanceEnded,
  refused,
  takenOut,
} from '../../common/band';
import { instrumentClip } from '../../common/band/instrumentClip';
import { startPerforming, stopPerforming } from '../../common/band/performing';
import { audioNow, dropPerformer, setPerformerPosition } from '../../sound/instruments';
import { effects } from '../../effects';
import { playUiSound } from '../../libs/sfx';
import type { Entity, ISystemFactory } from '../world';

/**
 * Performers: the hero with an instrument out, and every player in scope the
 * proxy says is playing. Gives them the row's pose - a few frames copied out
 * of an emote, looped (`band/instrumentClip.ts`) - hangs the model on the
 * hand bone, and ends the performance the moment they step, get hit into
 * another clip, or die.
 *
 * Before `AnimationSystem`, like `EmoteSystem`: it writes
 * `playerAnimation.action`, and the animation pass plays it like any clip.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Play rate of the copied clip: a slow sway, not the dance. */
const CLIP_SPEED = 0.25;

/** Seconds between two notes shown for one performer: a chord is one note, not six. */
const NOTE_GAP = 0.09;

/** Tiles above the instrument's origin (the hand) a note is born. */
const NOTE_HEIGHT = 0.15;

/** Dev seams: `?instRot=x,y,z` / `?instOff=x,y,z` (BMD deg / cm). */
const rotDev = devQueryNumbers('instRot', 3);
const offDev = devQueryNumbers('instOff', 3);
/** `?band=<id>`: the offline scene takes the instrument out by itself. */
const bandDev = devQuery('band');

// ---- 2. the system ---------------------------------------------------------

/** A live-tuned link (dev only), used for the hero's next attach. */
let linkOverride: { angle: [number, number, number]; offset: [number, number, number] } | null = null;

/** A live-tuned frame window (dev only) for the hero's clip. */
let poseOverride: { from: number; to: number; sway: number } | null = null;

/** Audio time of the last note each performer showed. */
const lastNoteAt = new WeakMap<Entity, number>();
const noteAt = new Vector3();

export const BandSystem: ISystemFactory = world => {
  const performers = world.with('performing', 'modelObject', 'transform', 'playerAnimation');

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

  /** The copied clip for this performer's model, made on first use; -1 until the model is in. */
  function ensureClip(e: Entity): number {
    const p = e.performing;
    const model = e.modelObject;
    if (!p || !model?.gltf) return -1;
    // A reloaded rig has no copy yet: its table ends where the source's did.
    if (p.clip >= 0 && model.gltf.animationGroups[p.clip]) return p.clip;
    const def = instrumentById(p.instrument);
    const window = p.local && poseOverride ? poseOverride : def.pose;
    const clip = instrumentClip(model, p.source, window.from, window.to, window.sway);
    if (clip === null) return -1;
    model.setActionSpeed(clip, CLIP_SPEED);
    p.clip = clip;
    return clip;
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

  // Dev hooks for tuning a row live: `__bandLink([ax,ay,az],[ox,oy,oz])`
  // rebuilds the hero's instrument on the bone with that link;
  // `__bandPose(from, to, sway)` recuts the hero's clip from that window (0..1).
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const w = window as unknown as { __bandLink: unknown; __bandPose: unknown };
    w.__bandLink = (angle: [number, number, number], offset: [number, number, number]) => {
      const hero = world.playerEntity;
      const p = hero?.performing;
      if (!hero || !p) return false;
      linkOverride = { angle, offset };
      detachModel(hero, p.model);
      p.model = null;
      return true;
    };
    w.__bandPose = (from: number, to: number, sway = 1) => {
      const hero = world.playerEntity;
      const p = hero?.performing;
      if (!hero || !p) return false;
      poseOverride = { from, to, sway };
      p.clip = -1;
      return true;
    };
  }

  return {
    update: dt => {
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
        const fresh = p.clip < 0;
        const clip = ensureClip(e);
        // The clip is taken the frame it is cut, so the takeover check below
        // never sees the idle it replaces.
        if (fresh && clip >= 0) e.playerAnimation.action = clip as PlayerAction;

        if (moving || e.dying || (p.local && clip >= 0 && e.playerAnimation.action !== clip)) {
          // A step, death, or - for the hero - an attack or skill that took
          // the clip: the performance is over. A remote performer's clip is
          // ours to hold; their own client sends the stop.
          stopPerforming(world, e);
          if (p.local) performanceEnded();
          continue;
        }

        if (clip >= 0) e.playerAnimation.action = clip as PlayerAction;

        // Every hit whose time has come floats a note up from the instrument
        // (effects/bandNotes.ts); the pose itself only sways. A chord's notes
        // land together, and one of them is the strum.
        const hits = p.hits;
        while (hits.length && hits[0].when <= now + dt) {
          const hit = hits.shift()!;
          const node = p.model?.node;
          if (!node || now - (lastNoteAt.get(e) ?? -Infinity) < NOTE_GAP) continue;
          lastNoteAt.set(e, now);
          noteAt.copyFrom(node.getAbsolutePosition());
          noteAt.y += NOTE_HEIGHT;
          effects.spawn('bandNotes', world.scene, noteAt, { pitch: hit.note, velocity: hit.velocity });
        }

        setPerformerPosition(keyOf(e), e.transform.pos.x, e.transform.pos.z, p.local);

        if (!p.model && e.modelObject.gltf?.skeleton) attachModel(e);
      }
    },
  };
};
