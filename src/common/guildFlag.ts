import {
  Mesh,
  RawTexture,
  StandardMaterial,
  Texture,
  TransformNode,
  VertexData,
  type Scene,
  type TransformNode as TransformNodeType,
} from '../libs/babylon/exports';
import { angleMatrix, toBabylon } from './boneLink';
import {
  GUILD_MARK_PALETTE,
  GUILD_MARK_SIZE,
  unpackGuildMark,
} from './guildMark';

/**
 * `RenderGuild` (ZzzCharacter.cpp:6388) — the guild flag every guild member
 * carries on the right shoulder: a 5x7 plane bound to the guild-mark texture,
 * hung off bone 26 with the character's own angle folded into the link matrix
 * a second time (the bone transform already carries it, ZzzBMD.cpp:134), which
 * is why the flag swings as the character turns.
 *
 * Drawn for `MODEL_PLAYER` only, never in Chaos Castle and never while the
 * wearer is cloaked (`RenderCharacter`:9450-9475).
 */

/** `o->BoneTransform[26]`. The GLB carries an extra root, hence the +1 there. */
export const GUILD_FLAG_BONE = 26;

/** `Angle[0] += 80; Angle[1] += 45; Angle[2] += 90 + 45;` over `o->Angle`. */
const FLAG_ANGLE: readonly [number, number, number] = [80, 45, 135];

/** `Matrix[*][3]` — 20 / -5 / -10 cm off the bone. */
const FLAG_OFFSET: readonly [number, number, number] = [20, -5, -10];
/** Thunder Hawk armour drops the flag further down the back (`-18`). */
const THUNDER_HAWK_OFFSET_Z = -18;

/** `RenderPlane3D(5.f, 7.f, ...)`: the quad spans ±5 in x/y and ±7 in z. */
const FLAG_WIDTH = 5;
const FLAG_HEIGHT = 7;

/** MU centimetres → metres, the scale `toBabylon` puts on translations. */
const CM = 1 / 100;

const DEG = Math.PI / 180;

/** `MODEL_THUNDER_HAWK_ARMOR` — group 5 (armour), number 39. */
const THUNDER_HAWK_ARMOR = { group: 5, num: 39 };

export function isThunderHawkArmor(
  armor: { group: number; num: number } | null | undefined
): boolean {
  return (
    !!armor &&
    armor.group === THUNDER_HAWK_ARMOR.group &&
    armor.num === THUNDER_HAWK_ARMOR.num
  );
}

/**
 * `CreateGuildMark` (ZzzInventory.cpp:11204) writes the 8x8 mark into
 * `BITMAP_GUILD`; palette entry 0 is the transparent one.
 */
export function guildMarkTexture(
  scene: Scene,
  packed: ArrayLike<number>,
  name: string
): RawTexture {
  const pixels = unpackGuildMark(packed);
  const data = new Uint8Array(GUILD_MARK_SIZE * GUILD_MARK_SIZE * 4);
  for (let i = 0; i < pixels.length; i++) {
    const index = pixels[i];
    const at = i * 4;
    if (!index) continue;
    const rgb = GUILD_MARK_PALETTE[index].match(/\d+/g);
    if (!rgb) continue;
    data[at] = Number(rgb[0]);
    data[at + 1] = Number(rgb[1]);
    data[at + 2] = Number(rgb[2]);
    data[at + 3] = 255;
  }

  const texture = RawTexture.CreateRGBATexture(
    data,
    GUILD_MARK_SIZE,
    GUILD_MARK_SIZE,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE
  );
  texture.name = name;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.hasAlpha = true;
  return texture;
}

/**
 * One flag: the quad, its material and the socket that hangs it off the bone.
 * Everything under the socket is in BMD space (metres), the same space the
 * link matrices of weaponAttachment / wings are written in.
 */
export class GuildFlag {
  private readonly socket: TransformNode;
  private readonly mesh: Mesh;
  private readonly material: StandardMaterial;
  private texture: RawTexture | null = null;
  /** The mark this flag's texture was built from, to know when to rebuild. */
  private markKey = '';
  private bone: TransformNodeType | null = null;

  constructor(private readonly scene: Scene) {
    this.socket = new TransformNode('guildFlagSocket', scene);

    this.material = new StandardMaterial('guildFlag', scene);
    // `glColor3f(1,1,1)` + `BindTexture`: the flag is drawn unlit, and
    // `EnableAlphaTest()` keeps the transparent palette entry out.
    this.material.disableLighting = true;
    this.material.emissiveColor.set(1, 1, 1);
    this.material.diffuseColor.set(0, 0, 0);
    this.material.specularColor.set(0, 0, 0);
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST;
    // The original culls (`EnableCullFace`), but the loader basis mirrors the
    // model, so which face survives is not the original's; two-sided keeps the
    // flag visible from both sides of the character instead of half the turn.
    this.material.backFaceCulling = false;

    this.mesh = new Mesh('guildFlag', scene);
    // `RenderPlane3D`: (-W,-W,-H) (W,W,-H) (W,W,H) (-W,-W,H), UVs bottom-left
    // to top-right, so the mark reads upright on the diagonal quad.
    const w = FLAG_WIDTH * CM;
    const h = FLAG_HEIGHT * CM;
    const vertex = new VertexData();
    vertex.positions = [-w, -w, -h, w, w, -h, w, w, h, -w, -w, h];
    vertex.uvs = [0, 1, 1, 1, 1, 0, 0, 0];
    vertex.indices = [0, 1, 2, 0, 2, 3];
    vertex.normals = [];
    VertexData.ComputeNormals(vertex.positions, vertex.indices, vertex.normals);
    vertex.applyToMesh(this.mesh);
    this.mesh.material = this.material;
    this.mesh.isPickable = false;
    this.mesh.alwaysSelectAsActiveMesh = true;
    this.mesh.parent = this.socket;
  }

  /** Rebuilds the texture when the guild's mark changes; hides an empty one. */
  setMark(packed: ArrayLike<number>): void {
    const key = Array.from(packed).join(',');
    if (key === this.markKey) return;
    this.markKey = key;
    this.texture?.dispose();
    this.texture = guildMarkTexture(this.scene, packed, 'guildMark');
    this.material.diffuseTexture = this.texture;
  }

  /** Bone 26 of the wearer, once its skeleton exists. */
  attach(bone: TransformNodeType): void {
    if (this.bone === bone) return;
    this.bone = bone;
    this.socket.parent = bone;
  }

  get attached(): boolean {
    return this.bone !== null;
  }

  set visible(value: boolean) {
    this.mesh.setEnabled(value);
  }

  /**
   * `AngleMatrix(o->Angle + FLAG_ANGLE)` then the offset — rebuilt per frame
   * because it reads the wearer's yaw.
   */
  update(yawRadians: number, thunderHawk: boolean): void {
    this.socket.setPreTransformMatrix(
      toBabylon(
        angleMatrix({
          angle: [
            FLAG_ANGLE[0],
            FLAG_ANGLE[1],
            FLAG_ANGLE[2] + yawRadians / DEG,
          ],
          offset: [
            FLAG_OFFSET[0],
            FLAG_OFFSET[1],
            thunderHawk ? THUNDER_HAWK_OFFSET_Z : FLAG_OFFSET[2],
          ],
        })
      )
    );
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
    this.texture?.dispose();
    this.socket.dispose();
  }
}
