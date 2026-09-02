import { registerDebugModule, type DebugRow } from '../../../../common/debugMenu';
import { ENUM_WORLD } from '../../../../common/types';
import { Store } from '../../../../store';

/**
 * Info: read-only counters off the live scene and engine - the perfOverlay's
 * numbers (Shift+Ctrl+Alt+P) in window form, plus where the hero stands.
 * The rows are closures the window re-reads on its 2 Hz tick; nothing here
 * runs while the menu is closed.
 */

function row(label: string, value: () => string): DebugRow {
  return { kind: 'info', id: label, label, value };
}

/** A value off the scene, '-' while no world is loaded. */
function scene(read: (scene: NonNullable<typeof Store.world>['scene']) => string): () => string {
  return () => {
    const world = Store.world;
    return world ? read(world.scene) : '-';
  };
}

registerDebugModule({
  id: 'info',
  title: 'Info',
  order: 40,
  rows: () => [
    { kind: 'section', id: 'frame', label: 'Frame' },
    row('FPS', scene(s => s.getEngine().getFps().toFixed(0))),
    row('Frame time', scene(s => `${s.getEngine().getDeltaTime().toFixed(1)} ms`)),
    row(
      'Draw calls',
      scene(s => {
        // `_drawCalls` is internal but always counted; fall back quietly.
        const calls = (
          s.getEngine() as unknown as { _drawCalls?: { current: number } }
        )._drawCalls?.current;
        return calls === undefined ? '?' : String(calls);
      })
    ),
    { kind: 'section', id: 'scene', label: 'Scene' },
    row(
      'Meshes',
      scene(s => {
        let enabled = 0;
        for (const mesh of s.meshes) if (mesh.isEnabled(false)) enabled++;
        return `${s.getActiveMeshes().length} act / ${enabled} on / ${s.meshes.length}`;
      })
    ),
    row('Triangles', scene(s => String((s.getActiveIndices() / 3) | 0))),
    row('Lights', scene(s => String(s.lights.length))),
    row('Particles', scene(s => String(s.particleSystems.length))),
    row(
      'Materials',
      scene(s => `${s.materials.length} / ${s.textures.length} textures`)
    ),
    { kind: 'section', id: 'world', label: 'World' },
    row('Map', () => {
      const world = Store.world?.mapIndex;
      return world === undefined ? '-' : `${ENUM_WORLD[world]} (${world})`;
    }),
    row('Hero tile', () => {
      const pos = Store.world?.playerEntity?.transform?.pos;
      return pos ? `${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}` : '-';
    }),
  ],
});
