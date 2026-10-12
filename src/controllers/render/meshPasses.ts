import { Vector3, type AbstractMesh } from './babylon/exports';
import { getDataTexture, getFlatLitVariant, getMaterial, getScrollVariant, ALPHA_TEST_AND_BLEND } from '../assets/modelLoader';
import { BlendState } from '@versions/shared/objects/enum';

/**
 * A pass's texture coordinates: the mesh's own, or one of `RenderMesh`'s chrome look-ups by the normal
 * (RENDER_CHROME, CHROME5, CHROME6, CHROME7; ZzzBMD.cpp:1600-1640). Read by the scroll materials (`uvMap`).
 */
export const UV_MAP = { mesh: 0, chrome: 1, chrome5: 5, chrome6: 6, chrome7: 7 } as const;
export type UvMap = keyof typeof UV_MAP;

/**
 * One `RenderMesh` a model's own `RenderPartObjectBody` branch adds (ZzzObject.cpp:6890-8920):
 *
 * - `add`: the mesh drawn again, additive, over its lit pass (RENDER_BRIGHT, or the blend mesh).
 * - `bright`: the mesh drawn additive in place of its lit pass.
 * - `unlit`: the mesh drawn at flat BodyLight in place of its lit pass (`StreamMesh`, a lone chrome pass).
 * - `blend`: the mesh drawn again, alpha blended at `alpha`, over it (RENDER_TEXTURE at alpha < 1).
 */
export type MeshPass = {
  /** The mesh, BMD order; -1 every mesh drawn (a `RenderBody`). */
  readonly mesh: number;
  readonly kind: 'add' | 'bright' | 'unlit' | 'blend';
  /** `b->BodyLight` for the pass, written into `out` from the body's light; omitted = the body's. */
  readonly light?: (ms: number, body: Vector3, out: Vector3) => void;
  /** `BlendMeshLight`, the blend branch's colour scale, at `ms` (`WorldTime`); omitted = 1. */
  readonly gain?: (ms: number) => number;
  /** `BlendMeshTexCoordU` / `V` at `ms`. */
  readonly u?: (ms: number) => number;
  readonly v?: (ms: number) => number;
  /** The `Data/` bitmap drawn in place of the mesh's own (`RenderMesh`'s explicit texture). */
  readonly texture?: string;
  /** That bitmap is loaded GL_CLAMP_TO_EDGE. */
  readonly clamp?: boolean;
  readonly map?: UvMap;
  /** A `blend` pass's alpha. */
  readonly alpha?: number;
};

export type MeshPassSet = {
  readonly passes: readonly MeshPass[];
  /** The meshes the branch draws lit at all; the rest are hidden. Omitted = every mesh. */
  readonly drawn?: readonly number[];
  /** Whether the passes are drawn (an option), read every frame. Omitted = always. */
  readonly shown?: () => boolean;
};

type LivePass = {
  readonly pass: MeshPass;
  readonly mesh: AbstractMesh;
  readonly light: Vector3 | null;
  readonly scroll: { u: number; v: number };
};

/**
 * A `MeshPassSet` bound to a loaded model: one clone per pass under the mesh's own parent (indices
 * stand), on the scroll materials, and the meshes the passes replace or the branch skips. See
 * render/readme.md.
 */
export class MeshPasses {
  readonly #live: LivePass[] = [];
  /** Model meshes hidden while the passes draw, and whether each was shown before. */
  readonly #hidden: AbstractMesh[] = [];
  readonly #wasShown: boolean[] = [];
  #on: boolean | null = null;

  constructor(
    private readonly set: MeshPassSet,
    meshes: readonly AbstractMesh[],
    private readonly body: Vector3
  ) {
    const hide = (mesh: AbstractMesh) => {
      if (this.#hidden.includes(mesh)) return;
      this.#hidden.push(mesh);
      this.#wasShown.push(mesh.isVisible);
    };
    const drawn = set.drawn;
    if (drawn) meshes.forEach((mesh, i) => drawn.includes(i) || hide(mesh));

    for (const pass of set.passes) {
      const targets = pass.mesh < 0 ? meshes.filter(m => m.isVisible && !this.#hidden.includes(m)) : [meshes[pass.mesh]];
      for (const mesh of targets) {
        if (!mesh) {
          console.warn(`Mesh pass on mesh ${pass.mesh} is out of range`);
          continue;
        }
        const clone = this.#clone(mesh, pass);
        if (!clone) continue;
        if (pass.kind === 'bright' || pass.kind === 'unlit') hide(mesh);
        this.#live.push({
          pass,
          mesh: clone,
          light: clone.metadata.bodyLight === body ? null : clone.metadata.bodyLight,
          scroll: clone.metadata.uvScroll,
        });
      }
    }
  }

  #clone(mesh: AbstractMesh, pass: MeshPass): AbstractMesh | null {
    const clone = mesh.clone(`${mesh.name}_pass`, mesh.parent, true);
    if (!clone) return null;
    const scene = mesh.getScene();
    const additive = pass.kind === 'add' || pass.kind === 'bright';
    clone.metadata = {
      ...mesh.metadata,
      bodyLight: pass.light ? new Vector3(1, 1, 1) : this.body,
      uvScroll: { u: 0, v: 0 },
      uvMap: UV_MAP[pass.map ?? 'mesh'],
      blendMeshLight: 1,
      brightMesh: additive,
      coverage: pass.alpha ?? 1,
      csmCaster: pass.kind === 'unlit' && mesh.metadata?.csmCaster,
      shadowSkip: pass.kind !== 'unlit',
      depthOccluder: pass.kind === 'unlit',
    };
    if (pass.texture) clone.metadata.diffuseTexture = getDataTexture(scene, pass.texture, pass.clamp);
    if (additive) {
      clone.material = getMaterial(scene, false, 2, BlendState.ALPHA_ONEOE, true);
      clone.material = getScrollVariant(scene, clone) ?? clone.material;
    } else if (pass.kind === 'blend') {
      clone.material = getMaterial(scene, false, ALPHA_TEST_AND_BLEND, BlendState.ALPHA_COMBINE);
    } else {
      clone.material = getFlatLitVariant(scene, clone) ?? clone.material;
    }
    clone.isPickable = false;
    clone.receiveShadows = false;
    clone.isVisible = false;
    return clone;
  }

  /** The clones this set made, in pass order. */
  get meshes(): readonly AbstractMesh[] {
    return this.#live.map(live => live.mesh);
  }

  /** Writes each pass's light, gain and scroll at `ms` (`WorldTime`); shows or hides the set as `shown` asks. */
  update(ms: number): void {
    const on = this.set.shown?.() ?? true;
    if (on !== this.#on) this.#show(on);
    if (!on) return;
    for (let i = 0; i < this.#live.length; i++) {
      const { pass, mesh, light, scroll } = this.#live[i];
      if (light && pass.light) pass.light(ms, this.body, light);
      if (pass.gain) mesh.metadata.blendMeshLight = pass.gain(ms);
      if (pass.u) scroll.u = pass.u(ms);
      if (pass.v) scroll.v = pass.v(ms);
    }
  }

  #show(on: boolean): void {
    this.#on = on;
    for (const live of this.#live) live.mesh.isVisible = on;
    for (let i = 0; i < this.#hidden.length; i++) this.#hidden[i].isVisible = on ? false : this.#wasShown[i];
  }
}
