import { describe, expect, it } from 'vitest';
import {
  CascadedShadowGenerator,
  ShadowGenerator,
  type AbstractMesh,
} from '../libs/babylon/exports';
import {
  CSM_PRIVATE_METHODS,
  CSM_WINDOW_MARGIN,
  csmCacheMapSize,
  isStaticCaster,
  marginOf,
} from './csmCache';

/**
 * The cache reaches into members Babylon marks private. They are checked
 * here rather than discovered as a black shadow map after an upgrade.
 */
describe('the Babylon surface the cache stands on', () => {
  const prototypes: Record<string, object> = {
    _computeCascadeFrustum: CascadedShadowGenerator.prototype,
    _computeMatrices: CascadedShadowGenerator.prototype,
    _splitFrustum: CascadedShadowGenerator.prototype,
    _renderForShadowMap: ShadowGenerator.prototype,
  };

  for (const name of CSM_PRIVATE_METHODS) {
    it(`${name} is still a method`, () => {
      const owner = prototypes[name] as Record<string, unknown>;

      expect(typeof owner[name]).toBe('function');
    });
  }

  it('still counts a cascade frustum one at a time', () => {
    const fn = CascadedShadowGenerator.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;

    expect(fn._computeCascadeFrustum.length).toBe(1);
  });
});

describe('map size and margin', () => {
  it('grows the map by the margin', () => {
    expect(csmCacheMapSize(2048, CSM_WINDOW_MARGIN)).toBe(2304);
    expect(csmCacheMapSize(4096, CSM_WINDOW_MARGIN)).toBe(4608);
  });

  it('reads the margin back out of the rounded size', () => {
    const size = csmCacheMapSize(2048, CSM_WINDOW_MARGIN);

    expect(marginOf(2048, size)).toBe(CSM_WINDOW_MARGIN);
  });

  it('never rounds the map below the base size', () => {
    for (const base of [1024, 2048, 4096]) {
      for (const margin of [1, 1.0625, 1.125, 1.25, 1.5]) {
        expect(csmCacheMapSize(base, margin)).toBeGreaterThanOrEqual(base);
      }
    }
  });
});

describe('isStaticCaster', () => {
  const mesh = (metadata: unknown) => ({ metadata }) as AbstractMesh;

  it('takes a prop-batch chunk', () => {
    expect(isStaticCaster(mesh({ propBatch: true }))).toBe(true);
  });

  it('leaves a per-object map object to the movers', () => {
    expect(isStaticCaster(mesh({ mapObject: true }))).toBe(false);
  });

  it('survives a mesh with no metadata', () => {
    expect(isStaticCaster(mesh(undefined))).toBe(false);
  });
});
