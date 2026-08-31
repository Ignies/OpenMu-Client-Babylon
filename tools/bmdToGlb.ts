import { Document, Node, NodeIO, type Skin } from '@gltf-transform/core';
import { BMD, BMDReader, BMDTextureBone } from '../src/common/BMD';
import { Glob } from 'bun';
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRMeshQuantization,
} from '@gltf-transform/extensions';
import { MeshoptEncoder } from 'meshoptimizer';
import { dedup, prune, quantize } from '@gltf-transform/functions';
import { PropertyType } from '@gltf-transform/core';
import sharp from 'sharp';
import { decodeTga } from '@lunapaint/tga-codec';
import { PNG } from 'pngjs';
import { BMD_EXT, DATA_FOLDER, OUTPUT_FOLDER } from './shared';

async function tga2png(file: Buffer) {
  const tga = await decodeTga(new Uint8Array(file));
  const png = new PNG({
    width: tga.details.header.width,
    height: tga.details.header.height,
  });
  png.data = Buffer.from(
    tga.image.data.buffer as ArrayBuffer,
    tga.image.data.byteOffset,
    tga.image.data.byteLength
  );

  return new Promise<Buffer>((resolve, reject) => {
    const bufs: Uint8Array[] = [];
    png
      .pack()
      .on('data', d => {
        bufs.push(d);
      })
      .on('end', () => {
        const buffer = Buffer.concat(bufs);

        resolve(buffer);
      })
      .on('error', reject);
  });
}

async function convertImageToWebP(image: Uint8Array): Promise<Uint8Array> {
  if (image.length > 0 && image[0] === 0x00 && image[1] === 0x00) {
    const inputBuffer = Buffer.from(image);
    const outputBuffer = await tga2png(inputBuffer);
    image = new Uint8Array(outputBuffer);
  }

  const buffer = await sharp(image).toFormat('webp').toBuffer();

  return new Uint8Array(buffer);
}

const texFailures: string[] = [];

async function readTextureBytes(texPath: string): Promise<Uint8Array> {
  const asIs = Bun.file(texPath);

  if (await asIs.exists()) {
    return asIs.bytes();
  }

  const base = texPath.replace(/\.[^.]+$/, '');

  // MU packs a texture in the container matching the format the BMD names,
  // and the extension is load-bearing: `.tga` means the 32-bit `.OZT`, which
  // carries the alpha key, and `.jpg`/`.bmp` mean the 24-bit `.OZJ`, which
  // has no alpha channel at all. The same base name usually ships as *both*.
  //
  // Searching OZJ-first regardless threw that away. `Grass03.bmd` asks for
  // `tree_01.tga` and got `tree_01.OZJ` — a 128x64 opaque JPEG in place of a
  // 32x32 cut-out — while the mesh stayed marked transparent by the `.tga`
  // test further down. An alpha-tested card whose alpha is a solid 1.0 draws
  // as a full rectangle, which is Lorencia's planter bushes and Devias' trees
  // rendering as flat grey pleated cards.
  //
  // Only textures shipping as both were affected, which is why the damage
  // looked arbitrary: `Grass01`/`Grass02` use `tree_08`, which has no `.OZJ`,
  // and came out correct through the same broken ordering.
  const ext = texPath.slice(texPath.lastIndexOf('.')).toLowerCase();

  const OZT: [string, number][] = [
    ['.OZT', 4],
    ['.ozt', 4],
  ];

  const OZJ: [string, number][] = [
    ['.OZJ', 24],
    ['.ozj', 24],
  ];

  // The non-matching container is still tried, last: a missing texture is a
  // worse outcome than an opaque one, and this is the only reason the wrong
  // ordering went unnoticed.
  const containers =
    ext === '.tga' ? [...OZT, ...OZJ] : [...OZJ, ...OZT];

  for (const [container, headerSize] of containers) {
    const file = Bun.file(base + container);

    if (await file.exists()) {
      return (await file.bytes()).slice(headerSize);
    }
  }

  throw new Error(`no texture found for ${texPath}`);
}

const SCALE_MULTIPLIER = 0.01;

const glob = new Glob(`**/*{${BMD_EXT.toUpperCase()},${BMD_EXT}}`);

const convertVec3 = (v: { x: number; y: number; z: number }) => v;

type Quaternion = { x: number; y: number; z: number; w: number };

function quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function quatInvert(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

const TRANSFORM_Q: Quaternion = { x: 0.5, y: -0.5, z: 0.5, w: -0.5 };
const TRANSFORM_Q_INV: Quaternion = quatInvert(TRANSFORM_Q);

function convertQuaternion(q: Quaternion): Quaternion {
  return q;
}

// `playertest.bmd` follows `Itemtest.bmd`: a leftover test asset. It converted
// to an 8.9 MB `playertest.glb` that nothing in src/ has ever referenced (todo
// C12). Ignored here so it stays out of the shipped folder; drop it from this
// list and re-run the converter if it is ever wanted back.
const IGNORE_FILES = [
  'Minimap.bmd',
  'skill.bmd',
  'item.bmd',
  'Itemtest.bmd',
  'playertest.bmd',
];

/**
 * Vertex-attribute quantization (todo C10).
 *
 * `KHR_mesh_quantization` stores attributes in narrower component types:
 * float32 normals become signed bytes, UVs unsigned shorts, and so on. The
 * runtime already supports it — `libs/babylon/exports.ts` imports the whole
 * `@babylonjs/loaders/glTF/2.0` index, which registers the loader extension —
 * so nothing has to change client-side.
 *
 * POSITION is deliberately excluded. To quantize positions, gltf-transform
 * shifts them into unit range and compensates with either a transform on the
 * parent node or, for a skinned mesh, synthesised inverse bind matrices. This
 * converter emits skins with *no* IBMs (identity), and `common/modelLoader`
 * builds the Babylon skeleton by hand from the `bone_<i>_` node names — the
 * exact area that already produced one silent mis-skinning regression (see
 * an earlier bone-ordering regression). The remaining
 * attributes carry most of the per-vertex bytes anyway:
 *
 *   NORMAL   vec3 f32 (12 B) → vec3 i8   (3 B, padded to 4)
 *   TEXCOORD vec2 f32  (8 B) → vec2 u16  (4 B)
 *   COLOR    vec4 f32 (16 B) → vec4 u8   (4 B)
 *   WEIGHTS  vec4 f32 (16 B) → vec4 u8   (4 B)
 *
 * so ~52 B/vertex of attributes drops to ~28 B with POSITION untouched.
 *
 * Set GLB_QUANTIZE_POSITION=1 to include POSITION as well; the flag exists so
 * the risky half can be measured separately, not because it is recommended
 * without a visual check of a skinned character and a mirrored map prop.
 */
const QUANTIZE_POSITION = process.env.GLB_QUANTIZE_POSITION === '1';

/**
 * `EXT_meshopt_compression` on top of quantization (todo C10), measured at a
 * further -20% on Monster/. Off by default, and deliberately so: unlike
 * quantization — whose output this repo verified attribute-by-attribute
 * against the previous GLBs — meshopt changes how every buffer view is
 * *stored*, so a mistake here does not degrade a model, it stops all of them
 * loading. The runtime side is wired and self-hosted
 * (`libs/babylon/exports.ts` → `public/js/meshopt_decoder.js`); turn this on
 * and check a character, a mirrored map prop and a weapon attachment render
 * before shipping it.
 *
 *   GLB_MESHOPT=1 bun run tools/bmdToGlb.ts
 *
 * Note it does NOT touch keyframe timing: meshopt is a buffer-view codec, so
 * `keys[1].frame - keys[0].frame` — which `ModelObject` reads to derive every
 * clip's playback speed — comes back exactly as written. That is also why
 * `resample()` is not used here despite animation data being ~40% of these
 * files: it removes redundant keys, which makes that spacing non-uniform and
 * would silently re-time every animation in the game.
 */
const USE_MESHOPT = process.env.GLB_MESHOPT === '1';

/**
 * Set GLB_COMPRESS=0 to write exactly what this converter produced before the
 * C10 pass. Kept so the shipped assets can be regenerated in their previous
 * form in one command — there is no VCS here to restore them from.
 */
const COMPRESS = process.env.GLB_COMPRESS !== '0';

async function compress(doc: Document, fileName: string): Promise<void> {
  if (!COMPRESS) return;

  try {
    await doc.transform(
      // Identical accessors across primitives collapse to one.
      //
      // ACCESSOR only, and TEXTURE/MATERIAL are deliberately excluded — they
      // were in this list and had to come out. Between them, dedup and the
      // prune below were *deleting live textures*: `Object1/Light01.glb` came
      // out with its `ston03` image, its texture and its material reference
      // gone entirely, and `Player/ArmorElf01.glb` lost `Player/hide`. That
      // second one is not just an untextured mesh — this runtime reads render
      // state off the texture *name* (`textureScript.ts`: `hide` means the
      // mesh is never drawn, `_R` means additive), so dropping a texture
      // silently turns a hidden mesh visible.
      //
      // Whatever the exact mechanism inside gltf-transform, a size pass has
      // no business touching the two property types this port hangs its
      // per-mesh behaviour on, and geometry is where the bytes are anyway.
      dedup({ propertyTypes: [PropertyType.ACCESSOR] }),
      quantize({
        pattern: QUANTIZE_POSITION
          ? /.*/
          : /^(NORMAL|TANGENT|TEXCOORD|COLOR|WEIGHTS)/,
        quantizeNormal: 8,
        quantizeTexcoord: 16,
        quantizeColor: 8,
        quantizeWeight: 8,
        normalizeWeights: true,
        // quantize() runs its own dedup+prune when cleanup is on (the
        // default), and that pass is unrestricted: it deletes player.glb`s
        // skin outright, because that file is a rig with no meshes and so
        // nothing references it. Cleanup is done below instead, limited to
        // leaf resources.
        cleanup: false,
      }),
      // Accessors the pass above orphaned. Same restriction, same reason as
      // the dedup: TEXTURE and MATERIAL are not candidates here.
      //
      // The original note on this call still stands and is why the list is
      // explicit at all. Unrestricted, `prune()` drops whatever no Scene
      // references, and `player.glb` is a rig with **no meshes at all**:
      // nothing references its skin, so a default prune deletes all 61 joints
      // and the file silently stops skinning every character. (`modelLoader`
      // synthesises the Babylon skeleton from that node graph — the same area
      // as the bone-ordering regression fixed earlier.)
      // Nodes, skins and animations are never candidates either.
      prune({
        propertyTypes: [PropertyType.ACCESSOR],
        keepLeaves: true,
        keepAttributes: true,
      })
    );
  } catch (e) {
    // A model that will not quantize is written uncompressed rather than
    // dropped: a fatter GLB is a far better outcome than a missing one.
    console.warn(`${fileName}: quantization skipped (${e}); writing as-is`);
  }
}

async function convertBMDToGLTF(bmd: BMD, outputFilename: string) {
  const fileName = outputFilename.split('/').at(-1)!.split('.')[0];

  const doc = new Document();
  const webpExtension = doc
    .createExtension(EXTTextureWebP as any)
    .setRequired(true);

  const buffer = doc.createBuffer();
  const scene = doc.createScene('mainScene');

  const modelRoot = doc.createNode(`model_${fileName}`);
  scene.addChild(modelRoot);

  const isSingleFrame =
    bmd.Bones.length === 1 &&
    bmd.Actions.length === 1 &&
    bmd.Actions[0].NumAnimationKeys === 1;

  let skin: Skin | undefined;

  const modelPos = { x: 0, y: 0, z: 0 };
  const modelRot = { x: 0, y: 0, z: 0, w: 1 };

  const allBonesWithoutParent = bmd.Bones.every(b => b.Parent === -1);
  if (bmd.Bones.length > 1 && allBonesWithoutParent) {
  }

  if (!isSingleFrame) {
    const skinNodes: Node[] = [];

    const skinRoot = doc.createNode(`skin_${fileName}`);
    skin = doc.createSkin();
    skin.setSkeleton(skinRoot);
    skin.addJoint(skinRoot);

    scene.addChild(skinRoot);

    let boneIndex = 0;
    for (const bmdBone of bmd.Bones) {
      const node = doc.createNode(`bone_${boneIndex}_${bmdBone.Name}`);
      skin.addJoint(node);

      skinNodes.push(node);

      // A bone whose parent is itself / a later bone (e.g. Object1/StreetLight01
      // bone 0 "Dummy" with Parent=0) would make the node graph cyclic and the
      // glTF loader recurse forever; the original client treats it as a root.
      const parentIndex = bmdBone.Parent;
      if (parentIndex < 0 || parentIndex >= boneIndex) {
        if (parentIndex >= 0) {
          console.warn(
            `${fileName}: bone ${boneIndex} "${bmdBone.Name}" has invalid parent ${parentIndex}, treating as root`
          );
        }
        skinRoot.addChild(node);
      } else {
        const parentNode = skinNodes[parentIndex];
        parentNode.addChild(node);
      }

      boneIndex++;
    }

    const DEFAULT_FPS = 24;

    for (let actionIndex = 0; actionIndex < bmd.Actions.length; actionIndex++) {
      const action = bmd.Actions[actionIndex];

      if (action.NumAnimationKeys === 0) continue;

      const animation = doc.createAnimation(
        `${fileName}_action_${actionIndex}`
      );

      const times: number[] = [];
      const dt =
        1 /
        (action.PlaySpeed && action.PlaySpeed > 0
          ? action.PlaySpeed * DEFAULT_FPS
          : DEFAULT_FPS);

      // How many of the authored keys the clip may actually reach — the
      // original's `Key` in PlayAnimation (ZzzBMD.cpp:415-421). A
      // LockPositions action wraps at `NumAnimationKeys - 1`, every other
      // action at `NumAnimationKeys`, so the last key of a locked action is
      // never displayed: it is a loop-closing duplicate of key 0 (measurably
      // so — across Player.bmd's walk/run actions the key N-1 -> key 0 delta
      // is ~0.1 against ~5 for every real interval). Emitting it as a real key
      // adds one motionless interval to every cycle: the legs hold while the
      // character keeps sliding, and the cycle runs 1/(N-1) too long.
      const keyCount =
        action.LockPositions && action.NumAnimationKeys > 1
          ? action.NumAnimationKeys - 1
          : action.NumAnimationKeys;

      for (let k = 0; k < keyCount; k++) {
        times.push(k * dt);
      }

      const isLongAnimation = keyCount > 1;

      // The wrap segment the original interpolates through: last key -> key 0.
      if (isLongAnimation) {
        times.push(keyCount * dt);
      }

      const inputAccessor = doc
        .createAccessor(`anim_${actionIndex}_input`)
        .setType('SCALAR')
        .setArray(new Float32Array(times))
        .setBuffer(buffer);

      const lockPositions = action.LockPositions;

      for (let boneIndex = 0; boneIndex < bmd.Bones.length; boneIndex++) {
        const bone = bmd.Bones[boneIndex];
        if (bone === BMDTextureBone.Dummy) continue;

        const boneMatrix = bone.Matrixes[actionIndex];

        if (
          boneMatrix.Position &&
          boneMatrix.Position.length === action.NumAnimationKeys
        ) {
          const posArray: number[] = [];
          for (let k = 0; k < keyCount; k++) {
            const cp = convertVec3(boneMatrix.Position[k]);
            posArray.push(
              cp.x * SCALE_MULTIPLIER,
              cp.y * SCALE_MULTIPLIER,
              cp.z * SCALE_MULTIPLIER
            );
          }

          if (boneIndex === 0 && lockPositions && posArray.length > 0) {
            for (let i = 3; i < posArray.length; i += 3) {
              posArray[i + 0] = posArray[0];
              posArray[i + 1] = posArray[1];
            }
          }

          if (isLongAnimation) {
            posArray.push(posArray[0], posArray[1], posArray[2]);
          }

          const posAccessor = doc
            .createAccessor(`anim_${actionIndex}_bone_${boneIndex}_T`)
            .setType('VEC3')
            .setArray(new Float32Array(posArray))
            .setBuffer(buffer);

          const sampler = doc
            .createAnimationSampler()
            .setInput(inputAccessor)
            .setOutput(posAccessor)
            .setInterpolation('LINEAR');

          const channel = doc
            .createAnimationChannel()
            .setTargetNode(skinNodes[boneIndex])
            .setTargetPath('translation')
            .setSampler(sampler);

          animation.addSampler(sampler).addChannel(channel);
        }

        if (
          boneMatrix.Quaternion &&
          boneMatrix.Quaternion.length === action.NumAnimationKeys
        ) {
          const rotArray: number[] = [];
          for (let k = 0; k < keyCount; k++) {
            const cq = convertQuaternion(boneMatrix.Quaternion[k]);
            rotArray.push(cq.x, cq.y, cq.z, cq.w);
          }

          if (isLongAnimation) {
            rotArray.push(rotArray[0], rotArray[1], rotArray[2], rotArray[3]);
          }

          const rotAccessor = doc
            .createAccessor(`anim_${actionIndex}_bone_${boneIndex}_R`)
            .setType('VEC4')
            .setArray(new Float32Array(rotArray))
            .setBuffer(buffer);

          const samplerR = doc
            .createAnimationSampler()
            .setInput(inputAccessor)
            .setOutput(rotAccessor)
            .setInterpolation('LINEAR');

          const channelR = doc
            .createAnimationChannel()
            .setTargetNode(skinNodes[boneIndex])
            .setTargetPath('rotation')
            .setSampler(samplerR);

          animation.addSampler(samplerR).addChannel(channelR);
        }
      }
    }
  } else {
    const bone = bmd.Bones[0];

    const boneMatrix = bone.Matrixes[0];

    const pos = boneMatrix.Position[0];
    const rot = boneMatrix.Quaternion[0];

    modelPos.x = pos.x * SCALE_MULTIPLIER;
    modelPos.y = pos.y * SCALE_MULTIPLIER;
    modelPos.z = pos.z * SCALE_MULTIPLIER;

    modelRot.x = rot.x;
    modelRot.y = rot.y;
    modelRot.z = rot.z;
    modelRot.w = rot.w;
  }

  let meshIndex = 0;
  const uniqueBonesPerMesh = new Set<number>();
  for (const bmdMesh of bmd.Meshes) {
    uniqueBonesPerMesh.clear();

    const node = doc.createNode(`node_${meshIndex}`);
    meshIndex++;
    modelRoot.addChild(node);

    if (skin) {
      node.setSkin(skin);
    } else {
      node.setTranslation([modelPos.x, modelPos.y, modelPos.z]);
      node.setRotation([modelRot.x, modelRot.y, modelRot.z, modelRot.w]);
    }

    const positionArray: number[] = [];
    const indicesArray: number[] = [];
    const texcoordArray: number[] = [];
    const normalsArray: number[] = [];
    const colorsArray: number[] = [];
    const boneIndexArray: number[] = [];
    const weightsArray: number[] = [];

    let pi = 0;

    const mesh = doc.createMesh(`mesh_${meshIndex}`);
    node.setMesh(mesh);

    for (let i = 0; i < bmdMesh.Triangles.length; i++) {
      const triangle = bmdMesh.Triangles[i];

      if (triangle.Polygon !== 3) throw new Error('Triangle is not a triangle');

      for (let j = 0; j < triangle.Polygon; j++) {
        const vertexIndex = triangle.VertexIndex[j];
        const vertex = bmdMesh.Vertices[vertexIndex];

        const normalIndex = triangle.NormalIndex[j];
        const normal = bmdMesh.Normals[normalIndex].Normal;
        const coordIndex = triangle.TexCoordIndex[j];
        const texCoord = bmdMesh.TexCoords[coordIndex];

        const pos = vertex.Position;
        const convPos = convertVec3(pos);

        positionArray.push(
          convPos.x * SCALE_MULTIPLIER,
          convPos.y * SCALE_MULTIPLIER,
          convPos.z * SCALE_MULTIPLIER
        );
        const convNormal = convertVec3(normal);
        normalsArray.push(convNormal.x, convNormal.y, convNormal.z);
        texcoordArray.push(texCoord.U, texCoord.V);
        colorsArray.push(1, 1, 1, 1);

        uniqueBonesPerMesh.add(vertex.Node + 1);

        if (!isSingleFrame) {
          boneIndexArray.push(vertex.Node + 1, 0, 0, 0);
          weightsArray.push(1, 0, 0, 0);
        }
      }

      const vInd0 = pi++;
      const vInd1 = pi++;
      const vInd2 = pi++;

      indicesArray.push(vInd0);
      indicesArray.push(vInd1);
      indicesArray.push(vInd2);
    }

    const indices = doc
      .createAccessor()
      .setArray(new Uint16Array(indicesArray))
      .setType('SCALAR')
      .setBuffer(buffer);
    const position = doc
      .createAccessor()
      .setArray(new Float32Array(positionArray))
      .setType('VEC3')
      .setBuffer(buffer);
    const texcoord = doc
      .createAccessor()
      .setArray(new Float32Array(texcoordArray))
      .setType('VEC2')
      .setBuffer(buffer);
    const normal = doc
      .createAccessor()
      .setArray(new Float32Array(normalsArray))
      .setType('VEC3')
      .setBuffer(buffer);
    const color = doc
      .createAccessor()
      .setArray(new Float32Array(colorsArray))
      .setType('VEC4')
      .setBuffer(buffer);

    const isTransparent = bmdMesh.TexturePath.endsWith('.tga');
    const texPath = DATA_FOLDER + bmd.Dir + bmdMesh.TexturePath;

    const texture = doc.createTexture(
      bmd.Dir + bmdMesh.TexturePath.split('.')[0]
    );
    let texSuccess = false;

    try {
      const bytes = await readTextureBytes(texPath);
      const webpBytes = await convertImageToWebP(bytes);
      texture.setImage(webpBytes);
      texture.setMimeType(`image/webp`);
      texSuccess = true;
    } catch (e) {
      texFailures.push(`${texPath}: ${(e as Error).message}`);
      // A Texture left in the document with no image makes gltf-transform's
      // GLB writer throw (`json.bufferViews[json.images[i].bufferView]` is
      // undefined) *after* `Bun.write(outputFilename, '')` has already
      // truncated the target: every 0-byte GLB in public/game-assets was a
      // model with one unresolvable texture. Drop the empty texture so the
      // mesh is written untextured instead of not at all.
      texture.dispose();
    }

    const material = doc
      .createMaterial()
      .setRoughnessFactor(1)
      .setMetallicFactor(0);

    material.setAlphaMode(isTransparent ? 'BLEND' : 'OPAQUE');

    if (texSuccess) {
      material.setBaseColorTexture(texture);
    }

    const prim = doc
      .createPrimitive()
      .setMaterial(material)
      .setIndices(indices)
      .setAttribute('POSITION', position)
      .setAttribute('TEXCOORD_0', texcoord)
      .setAttribute('NORMAL', normal)
      .setAttribute('COLOR_0', color);

    if (!isSingleFrame) {
      const boneIndex = doc
        .createAccessor()
        .setArray(new Uint8Array(boneIndexArray))
        .setType('VEC4')
        .setBuffer(buffer);
      const weights = doc
        .createAccessor()
        .setArray(new Float32Array(weightsArray))
        .setType('VEC4')
        .setBuffer(buffer);

      prim
        .setAttribute('JOINTS_0', boneIndex)
        .setAttribute('WEIGHTS_0', weights);
    }

    mesh.addPrimitive(prim);
  }

  await compress(doc, fileName);

  if (USE_MESHOPT) {
    const meshopt = doc.createExtension(EXTMeshoptCompression as any) as any;
    meshopt.setRequired(true).setEncoderOptions({
      method: (EXTMeshoptCompression as any).EncoderMethod.QUANTIZE,
    });
  }

  const io = new NodeIO();
  io.registerExtensions([
    EXTTextureWebP as any,
    KHRMeshQuantization as any,
    EXTMeshoptCompression as any,
  ]);
  io.registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  await Bun.write(outputFilename, '', { createPath: true });
  await io.write(outputFilename, doc);
}

if (USE_MESHOPT) await MeshoptEncoder.ready;

const reader = new BMDReader();

const folderFilters = process.argv.slice(2).map(f => f.replace(/[/\\]+$/, ''));

const files = [...glob.scanSync(DATA_FOLDER)].filter(file => {
  if (folderFilters.length === 0) return true;

  const normalized = file.replace(/\\/g, '/').toLowerCase();

  // Filters are folders ("Object1") or single files ("Object1/StreetLight01.bmd").
  return folderFilters.some(
    filter =>
      normalized.startsWith(filter.toLowerCase() + '/') ||
      normalized === filter.toLowerCase()
  );
});

if (folderFilters.length > 0) {
  console.log(
    `Filtering to [${folderFilters.join(', ')}]: ${files.length} models`
  );
}

async function processFile(rawRelInputFilePath: string) {
  const relInputFilePath = rawRelInputFilePath.replace(/\\/g, '/');

  const inputFileName = relInputFilePath.split('/').at(-1)!;

  const absInputFilePath = DATA_FOLDER + relInputFilePath;
  const inputFolder = relInputFilePath.replace(inputFileName, '');
  const outputFileName =
    OUTPUT_FOLDER + relInputFilePath.replace(BMD_EXT, '.glb');

  for (const ignoreFile of IGNORE_FILES) {
    if (ignoreFile === inputFileName) {
      return;
    }
  }

  const buffer = await Bun.file(absInputFilePath).bytes();

  try {
    const bmd = reader.read(buffer, inputFolder);

    // Some BMDs legitimately contain no geometry, and their GLBs carry bones
    // and animations only. Verified byte-exact against the sources (an
    // independent layout walk consumes the whole file with a mesh count of 0
    // in the header): Player/player.bmd
    // and the NPC/Girl01|Man01|Female01 rigs, whose geometry ships in the
    // *Head/*Upper/*Lower part files and is composed at runtime (see
    // src/common/npcs/lumen.ts), plus animation-only companions such as
    // NPC/songkoani.bmd (for songko.bmd) or Monster/condra_7_cone_left.bmd.
    // Logged so a 0-mesh GLB is never again mistaken for a converter bug —
    // but a *new* name appearing in this list is worth a look.
    if (bmd.Meshes.length === 0) {
      console.log(
        `${relInputFilePath}: rig-only BMD (mesh count 0 in source) — GLB carries bones+animations only`
      );
    }

    await convertBMDToGLTF(bmd, outputFileName);
  } catch (e) {
    console.error(`Error converting ${absInputFilePath}:`, e);
  }
}

await Promise.all(files.map(processFile));

console.log(`Processed ${files.length} files!`);

if (texFailures.length > 0) {
  console.warn(`\n${texFailures.length} textures could not be resolved:`);
  for (const failure of texFailures.slice(0, 20)) {
    console.warn(`  ${failure}`);
  }
  if (texFailures.length > 20) {
    console.warn(`  ...and ${texFailures.length - 20} more`);
  }
} else {
  console.log('All referenced textures resolved.');
}





