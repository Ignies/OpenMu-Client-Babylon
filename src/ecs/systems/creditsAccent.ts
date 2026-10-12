// CREDITS NOTICE - protected by LICENSE ("Additional condition"): part of the credits module and the
// visuals it draws for contributors; must not be removed, disabled or altered (AGENTS.md, "Credits").

import type { PlayerObject } from '../../controllers/actors/playerObject';
import { CreditsAccent } from '../../controllers/actors/creditsAccent';
import { bonePos, entityPos } from '../../controllers/fx/core';
import { Vector3 } from '../../controllers/render/babylon/exports';
import { CreditsRoll } from '../../modules/credits';
import { Hero } from '../../modules/hero';
import type { Entity } from '../world';

/** `eBuff_Cloaking` (_enum.h): nothing while cloaked, as gmMark.ts. */
const CLOAKING = 18;
/** The head bone the GM mark rides too (`CSParts::IRender`, CSParts.cpp:186-212). */
const HEAD_BONE = 20;
/** Over the head bone, world units. */
const LIFT = 0.32;

/** Whether this player is credited (the hero's name for the hero). */
export function wantsCreditsAccent(e: Entity, heroName: string, credited: (name: string) => boolean): boolean {
  if (e.npcType !== undefined || e.buffs?.has(CLOAKING)) return false;
  const name = e.objectNameInWorld || (e.localPlayer ? heroName : '');
  return !!name && credited(name);
}

type Seen = { name: string; version: number; cloaked: boolean; wants: boolean; body: PlayerObject | null; accent: CreditsAccent | null };

const seen = new WeakMap<Entity, Seen>();
const credited = (name: string) => CreditsRoll.isCredited(name);
const head = new Vector3();
const feet = new Vector3();

function drop(s: Seen): void {
  s.accent?.dispose();
  s.accent = null;
  s.body = null;
}

/**
 * Called every frame by `AppearanceSystem`; the name test runs again only when the name, the cloak
 * or the list changes.
 */
export function syncCreditsAccent(e: Entity, model: PlayerObject, visible: boolean): void {
  CreditsRoll.request();
  let s = seen.get(e);
  if (!s) seen.set(e, (s = { name: '', version: -1, cloaked: false, wants: false, body: null, accent: null }));

  const name = e.objectNameInWorld || (e.localPlayer ? Hero.name : '');
  const cloaked = !!e.buffs?.has(CLOAKING);
  if (s.name !== name || s.version !== CreditsRoll.version || s.cloaked !== cloaked) {
    s.name = name;
    s.version = CreditsRoll.version;
    s.cloaked = cloaked;
    s.wants = wantsCreditsAccent(e, Hero.name, credited);
  }

  if (s.body !== model) drop(s);
  if (!s.wants) {
    if (s.accent) drop(s);
    return;
  }
  if (!s.accent) {
    const accent = new CreditsAccent(model.node.getScene());
    const owner = s;
    s.accent = accent;
    s.body = model;
    model.node.onDisposeObservable.addOnce(() => {
      if (owner.accent === accent) drop(owner);
    });
  }

  bonePos(e, HEAD_BONE, head, 1.6);
  head.y += LIFT;
  entityPos(e, 0, feet);
  s.accent.place(head, feet, visible && model.node.isEnabled());
}
