import { TILE_CM } from './terrain/consts';
import { Matrix, Vector3 } from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import type { ModelObject } from './modelObject';
import { createEffectLight, type EffectLight } from './effectLights';
import {
  lightEmittersFor,
  lightMapObject,
  type LightEmitter,
} from '../lighting/mapObjectLights';
import type { LightSource } from '../lighting/lightSource';
import { ParticleEmitter, type Emission } from './effectParticles';

/**
 * The adapter between a `ModelObject` and its rows in the lighting layer's
 * map-object table (`src/lighting/mapObjectLights.ts`): resolves each row's
 * offset in the object's frame, asks the entry for the light, draws the
 * flare and the particles that ride along, and feeds the light's colour
 * back into the particle tint and the object's own `SelfLight` — the
 * original adds a burning object's light to its own body.
 *
 * Owns no registration: the `LightSource` handles are the entry's; this
 * class only disposes them with the object.
 */


const SELF_LIGHT = 1;

const localOffset = Vector3.Zero();
const rotatedOffset = Vector3.Zero();
const rotation = Matrix.Identity();

export class MapObjectLights {
  #sprites: EffectLight[] = [];
  #emitters: ParticleEmitter[] = [];
  #sources: LightSource[] = [];

  #object: ModelObject | null = null;

  emitsLight = false;

  #disposed = false;

  private constructor() {}

  static attach(world: World, object: ModelObject): MapObjectLights | null {
    const emitters = lightEmittersFor(object.WorldIndex, object.Type);

    if (!emitters?.length) return null;

    const attached = new MapObjectLights();

    attached.#object = object;

    for (const emitter of emitters) {
      attached.#attachOne(world, object, emitter);
    }

    return attached;
  }

  #attachOne(world: World, object: ModelObject, emitter: LightEmitter): void {
    const node = object.node;
    const objectScale = node.scaling.x;
    const position = resolveEmitterPosition(object, emitter);

    const source = lightMapObject(world.scene, emitter, position);

    if (source) {
      this.#sources.push(source);
      this.emitsLight = true;
    }

    if (emitter.sprite) {
      void createEffectLight(
        world.scene,
        emitter.sprite,
        position,
        objectScale
      ).then(light => {
        if (!light) return;

        if (this.#disposed) light.dispose();
        else this.#sprites.push(light);
      });
    }

    const emissions =
      typeof emitter.emissions === 'function'
        ? emitter.emissions(objectScale)
        : emitter.emissions;

    if (emissions?.length) {
      this.#emitters.push(
        new ParticleEmitter(
          world.scene,
          tintEmissions(emissions, source),
          position,
          node.rotation.y,
          objectScale
        )
      );
    }
  }

  update(): void {
    for (const emitter of this.#emitters) emitter.update();

    this.#updateSelfLight();
  }

  #updateSelfLight(): void {
    const object = this.#object;

    if (!object || this.#sources.length === 0) return;

    let r = 0;
    let g = 0;
    let b = 0;

    for (const source of this.#sources) {
      const c = source.color;

      r += c.r;
      g += c.g;
      b += c.b;
    }

    object.SelfLight.set(r * SELF_LIGHT, g * SELF_LIGHT, b * SELF_LIGHT);
  }

  dispose(): void {
    this.#disposed = true;

    for (const sprite of this.#sprites) sprite.dispose();
    this.#sprites.length = 0;

    for (const source of this.#sources) source.dispose();
    this.#sources.length = 0;

    this.#emitters.length = 0;

    this.#object?.SelfLight.setAll(0);
    this.#object = null;
  }
}

/** Particles without their own `light` take the source's current colour. */
function tintEmissions(
  emissions: readonly Emission[],
  source: LightSource | null
): Emission[] {
  if (!source) return emissions.slice();

  const tint: [number, number, number] = [1, 1, 1];

  const light = () => {
    const { r, g, b } = source.color;

    tint[0] = r;
    tint[1] = g;
    tint[2] = b;

    return tint;
  };

  return emissions.map(emission =>
    emission.light ? emission : { ...emission, light }
  );
}

function resolveEmitterPosition(
  object: ModelObject,
  emitter: LightEmitter
): { x: number; y: number; z: number } {
  const node = object.node;
  const { x, y, z } = node.position;

  if (!emitter.offset) return { x, y, z };

  const [ox, oy, oz] = emitter.offset;

  localOffset.set(ox / TILE_CM, oz / TILE_CM, oy / TILE_CM);

  Matrix.RotationYawPitchRollToRef(
    node.rotation.y,
    node.rotation.x,
    node.rotation.z,
    rotation
  );

  Vector3.TransformCoordinatesToRef(localOffset, rotation, rotatedOffset);

  return {
    x: x + rotatedOffset.x,
    y: y + rotatedOffset.y,
    z: z + rotatedOffset.z,
  };
}
