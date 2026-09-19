import type { Emission } from '../../common/effectParticles';
import type { MeshAnimation } from '../../common/meshAnimation';
import type { LightEmitter } from '../../lighting/mapObjectLights';
import {
  VULCANUS_EMISSIONS,
  VULCANUS_LIGHTS,
} from '../vulcanus/spec';

/**
 * Doppelganger 2 (`WD_66DOPPLEGANGER2`, `World67`/`Object67`), the plain-data
 * half - Vulcanus' art and, for the vents, Vulcanus' code. `CreateObject`
 * (GMDoppelGanger2.cpp:33-42), `MoveObject` (:55-78) and the seven vent cases
 * of `RenderObjectVisual` (:407-512) are `CGM_PK_Field`'s
 * (GM_PK_Field.cpp:230-389) line for line, with 47 and 48 added to the hidden
 * list; the rest of `RenderObjectMesh` (:231-396) and
 * `RenderAfterObjectMesh` (:625-654) are this map's own.
 *
 * EncTerrain67.obj: 253 objects, 15 types; Object67 ships 31 models, all
 * present. Also an `IsTerrainHeightExtMap` world (24-bit height) and shares
 * the `song_lava1.jpg` slot-11 rule.
 *
 * Nothing sets `Alpha` or `Velocity` per type and the map owns no entity, so
 * there is no `create.ts`. `CreateObject`'s `CollisionRange = -300` on 0-6
 * only makes the vents unpickable, and they are hidden markers here anyway.
 */

/**
 * No `o->BlendMesh` writes; these two are the literal `blendMesh` argument
 * the render hook passes instead, which is the same mesh drawn additive.
 *
 *  - **16** (x15, :255-260): `song_lava2.smd`, one mesh - the lava sheet,
 *    whole body as blend mesh 0 at a breathing light (see
 *    `DOPPELGANGER2_MESH_ANIMATION`). `RenderAfterObjectMesh` :632-637 draws
 *    it a second time, but nothing ever sets `m_bRenderAfterCharacter` on 16,
 *    so that copy never runs.
 *  - **72** (x79, :347-355): `chovolcano_01.smd`, two meshes - mesh 0 keeps
 *    its lit pass, mesh 1 is the additive one that breathes.
 *  - **33** (x13, :240-246 + :645-650): `Lightbim.smd`, one mesh - the light
 *    beam, its lit pass skipped for a single `RENDER_BRIGHT` pass on mesh 0
 *    with a V scroll, drawn after the characters.
 *
 * Types **10** (x19), **19** (x7), **20** (x18) and **31** (x2) are only
 * deferred past the characters (:240-246, drawn unchanged at :638-644) - the
 * beam centre and the three portal pieces. Draw order is not something a map
 * entry can ask for here and the bodies are identical either way, so nothing
 * is ported for them.
 */
export const DOPPELGANGER2_BLEND_MESHES: Readonly<Record<number, number>> = {
  16: 0,
  33: 0,
  72: 1,
};

/** `MoveObject` :62-72: 0-6 (the vents) and 47 (x0), 48 (x2). */
export const DOPPELGANGER2_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 47, 48,
];

/**
 * The vents are Vulcanus' table unchanged - of them only 3 (x40, the red fog
 * box) and 6 (x12, the red fire box, whose flare and terrain light are in
 * `DOPPELGANGER2_LIGHTS`) are placed here. 47 and 48 are this map's two
 * extras, and are Doppelganger 1's 70 and 101 verbatim:
 *
 *  - **47** (x0, :513-531), the blue-fire box: one of three `_MONO` fire
 *    sheets at random plus a fourth spawn every frame, tinted
 *    `(0.1, 0.4, 1.0)`. `fire157` is the only mono sheet `effectParticles`
 *    carries, so it stands for all three.
 *  - **48** (x2, :532-543), the sky-blue light box: a `BITMAP_LIGHT` SubType
 *    15 mote one tick in three, jittered +/-30 in x/y and tinted
 *    `(0.6, 0.8, 1.0)`. SubType 15 is a 100-tick spiral climb
 *    (ZzzEffectParticle.cpp:3241-3250, :8139-8160); `spark03_24` is the only
 *    sparkle kind that keeps the emission's own colour, so it stands in, short.
 */
export const DOPPELGANGER2_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  ...VULCANUS_EMISSIONS,
  47: [{ kinds: ['fire157'], every: 1, count: 2, light: [0.1, 0.4, 1] }],
  48: [{ kinds: ['spark03_24'], every: 3, light: [0.6, 0.8, 1], jitter: 30 }],
};

export const DOPPELGANGER2_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = VULCANUS_LIGHTS;

/**
 * The per-frame mesh writes, for `common/meshAnimation.ts`.
 *
 *  - **15** (x0, :247-254): `StreamMesh = 0` and the body's V ramped down
 *    over ten seconds. No model in Object67 and nothing placed; kept because
 *    the source has it (`CGM_PK_Field` :391-399 is identical).
 *  - **16** (x15, :255-260): `(sinf(t * 0.002) + 1) * 0.5`, the lava sheet
 *    fading in and out over about 52 seconds.
 *  - **33** (x13, :645-650): `(int)WorldTime % 10000 * 0.0001f`, a V ramp
 *    0 -> 0.9999 every ten seconds. The original also sets `StreamMesh = 0`
 *    for that draw; `'blend'` is the closer of the two kinds the table offers,
 *    because the additive material the beam is already on is unlit anyway and
 *    `'stream'` would swap it back to a flat opaque one.
 *  - **72** (x79, :347-355): `(sinf(t * 0.003) + 1) * 0.5 * 0.5 + 0.5`, mesh
 *    1 breathing between half and full.
 */
export const DOPPELGANGER2_MESH_ANIMATION: Partial<
  Record<number, MeshAnimation>
> = {
  15: { mesh: 0, kind: 'stream', v: t => -((t % 10000) * 0.0001) },
  16: { mesh: 0, kind: 'blend', light: t => (Math.sin(t * 0.002) + 1) * 0.5 },
  33: { mesh: 0, kind: 'blend', v: t => (t % 10000) * 0.0001 },
  72: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.003) * 0.25 + 0.75 },
};
