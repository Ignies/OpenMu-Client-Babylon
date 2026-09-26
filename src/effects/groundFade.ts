/**
 * Ground fade for particle cards (`ParticleRecipe.groundFade`): a card that crosses
 * the terrain fades to nothing over the last `band` tiles above it, so the ground's
 * depth test never cuts its glow along a hard line. The stock particle shader with
 * one multiply; the floor is the highest ground a live burst of the system came from.
 * Additive recipes only (the colour carries the fade).
 */
import { ShaderStore, type Effect, type ParticleSystem } from '../libs/babylon/exports';

const FRAGMENT = 'fxGroundFadeParticles';

interface Floor {
  y: number;
  /** Effects-clock second the last burst's particles are all dead by. */
  until: number;
  band: number;
  defines: string;
}

const floors = new WeakMap<ParticleSystem, Floor>();

function register(): void {
  const key = `${FRAGMENT}PixelShader`;
  if (ShaderStore.ShadersStore[key]) return;
  ShaderStore.ShadersStore[key] = ShaderStore.ShadersStore.particlesPixelShader
    .replace(
      '#define CUSTOM_FRAGMENT_DEFINITIONS',
      'varying vec3 vPositionW;\nuniform vec2 groundFade;\n#define CUSTOM_FRAGMENT_DEFINITIONS'
    )
    .replace(
      '#include<logDepthFragment>',
      'baseColor.rgb*=smoothstep(groundFade.x,groundFade.x+groundFade.y,vPositionW.y);\n#include<logDepthFragment>'
    );
}

/** The system's effect, rebuilt when its defines moved (a tier flip changes image processing). */
function refreshEffect(ps: ParticleSystem, f: Floor): void {
  const list: string[] = [];
  ps.fillDefines(list, ps.blendMode);
  const defines = list.join('\n');
  if (defines === f.defines) return;
  f.defines = defines;
  const engine = ps.getScene()!.getEngine();
  ps.setCustomEffect(
    engine.createEffectForParticles(FRAGMENT, ['groundFade'], [], defines, undefined, undefined, undefined, ps),
    ps.blendMode
  );
}

/** Give a new system the fade over `band` tiles. */
export function useGroundFade(ps: ParticleSystem, band: number): void {
  register();
  const f: Floor = { y: -1e9, until: -1, band, defines: '' };
  floors.set(ps, f);
  ps.onBeforeDrawParticlesObservable.add((effect: Effect | null) => {
    effect?.setFloat2('groundFade', f.y, f.band);
  });
}

/** A burst over ground `y` at effects time `now`, its particles dead `life` seconds later. */
export function noteGroundFloor(ps: ParticleSystem, y: number, now: number, life: number): void {
  const f = floors.get(ps);
  if (!f) return;
  refreshEffect(ps, f);
  f.y = now > f.until ? y : Math.max(f.y, y);
  f.until = Math.max(f.until, now + life);
}
