import '@babylonjs/core/Misc/observableCoroutine';
import '@babylonjs/core/Culling/ray';
// Adds AbstractMesh.createOrUpdateSubmeshesOctree, used by the terrain so
// ray picks do not test all 131k of its triangles.
import '@babylonjs/core/Culling/Octrees/octreeSceneComponent';
import '@babylonjs/loaders/glTF/2.0/index';
import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader';
import '@babylonjs/core/Layers/effectLayerSceneComponent';

const env = import.meta.env || {};

let baseUrl = (env.BASE_URL || '') + 'js/';

import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import { MeshoptCompression } from '@babylonjs/core/Meshes/Compression/meshoptCompression';
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
import { BasisToolsOptions } from '@babylonjs/core/Misc/basis';

DracoCompression.Configuration = {
  decoder: {
    wasmUrl: baseUrl + 'draco_wasm_wrapper_gltf.js',
    wasmBinaryUrl: baseUrl + 'draco_decoder_gltf.wasm',
    fallbackUrl: baseUrl + 'draco_decoder_gltf.js',
  },
};

// EXT_meshopt_compression (todo C10). Babylon's default points at
// cdn.babylonjs.com; every other decoder here is self-hosted, so this one is
// too — `public/js/meshopt_decoder.js` is a straight copy of
// `node_modules/meshoptimizer/meshopt_decoder.cjs`, whose UMD tail assigns
// `self.MeshoptDecoder` when it is loaded as a classic script, which is what
// `Tools.LoadBabylonScriptAsync` does. Re-copy it if meshoptimizer is
// upgraded. Nothing fetches it unless a GLB actually declares the extension.
MeshoptCompression.Configuration = {
  decoder: {
    url: baseUrl + 'meshopt_decoder.js',
  },
};

(KhronosTextureContainer2.URLConfig as any) = {
  jsDecoderModule: baseUrl + 'babylon.ktx2Decoder.js',
  wasmUASTCToASTC: baseUrl + 'ktx2Transcoders/1/uastc_astc.wasm',
  wasmUASTCToBC7: baseUrl + 'ktx2Transcoders/1/uastc_bc7.wasm',
  wasmUASTCToRGBA_UNORM:
    baseUrl + 'ktx2Transcoders/1/uastc_rgba8_unorm_v2.wasm',
  wasmUASTCToRGBA_SRGB: baseUrl + 'ktx2Transcoders/1/uastc_rgba8_srgb_v2.wasm',
  jsMSCTranscoder: baseUrl + 'ktx2Transcoders/1/msc_basis_transcoder.js',
  wasmMSCTranscoder: baseUrl + 'ktx2Transcoders/1/msc_basis_transcoder.wasm',
  wasmZSTDDecoder: baseUrl + 'zstddec.wasm',
};

BasisToolsOptions.JSModuleURL =
  baseUrl + 'basisTranscoder/1/basis_transcoder.js';
BasisToolsOptions.WasmModuleURL =
  baseUrl + 'basisTranscoder/1/basis_transcoder.wasm';

export { Engine } from '@babylonjs/core/Engines/engine';
export {
  Vector2,
  Vector3,
  Vector4,
  Matrix,
  Quaternion,
} from '@babylonjs/core/Maths/math.vector';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
export { Viewport } from '@babylonjs/core/Maths/math.viewport';
export { Scene, ScenePerformancePriority } from '@babylonjs/core/scene';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
export { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
export { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
export { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
export { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
export { Plane } from '@babylonjs/core/Maths/math.plane';
export { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
export { CreateDecal } from '@babylonjs/core/Meshes/Builders/decalBuilder';
export type { Light } from '@babylonjs/core/Lights/light';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export type { Camera } from '@babylonjs/core/Cameras/camera';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
export { RawTexture2DArray } from '@babylonjs/core/Materials/Textures/rawTexture2DArray';
export { Observable, Observer } from '@babylonjs/core/Misc/observable';
export type { Node } from '@babylonjs/core/node';
export { ActionManager } from '@babylonjs/core/Actions/actionManager';
export { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
// Side-effect import: registers the WebGL2 backend GPUParticleSystem needs.
import '@babylonjs/core/Particles/webgl2ParticleSystem';
export { GPUParticleSystem } from '@babylonjs/core/Particles/gpuParticleSystem';
export type { IParticleSystem } from '@babylonjs/core/Particles/IParticleSystem';
export { NoiseProceduralTexture } from '@babylonjs/core/Materials/Textures/Procedurals/noiseProceduralTexture';
export { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
export { SolidParticle } from '@babylonjs/core/Particles/solidParticle';

export { Animation } from '@babylonjs/core/Animations/animation';
export { Animatable } from '@babylonjs/core/Animations/animatable';
export { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';

export { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
export type { IMouseEvent } from '@babylonjs/core/Events';

export { Path3D } from '@babylonjs/core/Maths/math.path';

export { Scalar } from '@babylonjs/core/Maths/math.scalar';

export {
  VertexAnimationBaker,
  BakedVertexAnimationManager,
} from '@babylonjs/core/BakedVertexAnimation';

export {
  AssetsManager,
  TextureAssetTask,
  MeshAssetTask,
  TextFileAssetTask,
} from '@babylonjs/core/Misc/assetsManager';
export { AssetContainer } from '@babylonjs/core/assetContainer';
export { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

export { Material } from '@babylonjs/core/Materials/material';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
export { CustomMaterial } from '@babylonjs/materials/custom/customMaterial';
export { PBRCustomMaterial } from '@babylonjs/materials/custom/pbrCustomMaterial';
export { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
export { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';

export { Constants } from '@babylonjs/core/Engines/constants';

import '@babylonjs/core/Sprites/spriteSceneComponent';
export { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';
export { Sprite } from '@babylonjs/core/Sprites/sprite';

import '@babylonjs/core/Rendering/depthRendererSceneComponent';
export { DepthRenderer } from '@babylonjs/core/Rendering/depthRenderer';
export { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
export { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
export { GeometryBufferRenderer } from '@babylonjs/core/Rendering/geometryBufferRenderer';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
export { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
export { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
export type { MultiRenderTarget } from '@babylonjs/core/Materials/Textures/multiRenderTarget';
export { SmartArray } from '@babylonjs/core/Misc/smartArray';
export type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
export { Skeleton } from '@babylonjs/core/Bones/skeleton';
export type { IPointerEvent } from '@babylonjs/core/Events';
export { Ray } from '@babylonjs/core/Culling/ray';
export { BoundingBox } from '@babylonjs/core/Culling/boundingBox';
export { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
export { Bone } from '@babylonjs/core/Bones/bone';
export type {
  IVector3Like,
  IVector2Like,
} from '@babylonjs/core/Maths/math.like';

export { PBRBaseSimpleMaterial } from '@babylonjs/core/Materials/PBR/pbrBaseSimpleMaterial';

export { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
export { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';

export { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
export { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
export { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
export { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
export { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
export { Effect } from '@babylonjs/core/Materials/effect';
export { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
export { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
export { CreateGreasedLine } from '@babylonjs/core/Meshes/Builders/greasedLineBuilder';
export type { GreasedLineMesh } from '@babylonjs/core/Meshes/GreasedLine/greasedLineMesh';
export type { GreasedLineSimpleMaterial } from '@babylonjs/core/Materials/GreasedLine/greasedLineSimpleMaterial';
export { GreasedLineMeshMaterialType } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialInterfaces';
export type { IGreasedLineMaterial } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialInterfaces';
export { GreasedLineMaterialDefaults } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialDefaults';
