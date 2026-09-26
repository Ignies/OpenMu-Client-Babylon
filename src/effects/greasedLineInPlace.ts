/**
 * Re-point GreasedLines in place. `GreasedLineMesh.setPoints` rebuilds the
 * whole mesh every call: fresh typed arrays, seven new GPU buffers and a new
 * vertex array object at the next draw. A line that moves every frame with a
 * fixed point count only needs its positions and each point's previous / next
 * neighbour rewritten, so this keeps one updatable buffer per attribute and
 * writes into it.
 *
 * Same layout `GreasedLineMesh._setPoints` builds (greasedLineMesh.js): two
 * vertices per point, lines one after another, open ends (an end point is its
 * own neighbour). The length counters are written once as each point's index
 * ratio: they only gate `visibility` and dashes, and a line drawn whole needs
 * neither to follow its length. Side signs, UVs, widths, indices and colour
 * pointers stay as the first build left them.
 *
 * Driven by: spiritSwarm.ts. Read by: nobody.
 */
import { Buffer, VertexBuffer, type GreasedLineMesh } from '../libs/babylon/exports';

export interface InPlaceLines {
  /** x, y, z per point, `lineCount` lines of `pointsPerLine` one after another: fill it, then `write()`. */
  readonly points: Float32Array;
  /** Send `points` to the GPU. */
  write(): void;
  /** Free the buffers this took over; the mesh's own go with the mesh. */
  dispose(): void;
}

/** Take over `mesh`'s point buffers, or null when its position buffer cannot be updated. */
export function inPlaceLines(mesh: GreasedLineMesh, pointsPerLine: number, lineCount = 1): InPlaceLines | null {
  const n = pointsPerLine;
  const total = n * lineCount;
  const posVB = mesh.getVertexBuffer(VertexBuffer.PositionKind);
  if (!posVB || !posVB.isUpdatable() || mesh.getTotalVertices() !== total * 2 || n < 2) return null;
  const engine = mesh.getScene().getEngine();
  const points = new Float32Array(total * 3);
  const pos = new Float32Array(total * 6);
  const prev = new Float32Array(total * 8);
  const next = new Float32Array(total * 8);
  for (let v = 0; v < total * 2; v++) {
    prev[v * 4 + 3] = 1 - ((v & 1) << 1);
    next[v * 4 + 3] = ((v >> 1) % n) / (n - 1);
  }
  const prevBuf = new Buffer(engine, prev, true, 4);
  const nextBuf = new Buffer(engine, next, true, 4);
  mesh.setVerticesBuffer(prevBuf.createVertexBuffer('grl_previousAndSide', 0, 4));
  mesh.setVerticesBuffer(nextBuf.createVertexBuffer('grl_nextAndCounters', 0, 4));

  return {
    points,
    write() {
      const p = points;
      for (let l = 0; l < lineCount; l++) {
        const first = l * n;
        const last = first + n - 1;
        for (let i = first; i <= last; i++) {
          const o = i * 3;
          const a = (i === first ? i : i - 1) * 3;
          const b = (i === last ? i : i + 1) * 3;
          const v = i * 6;
          pos[v] = pos[v + 3] = p[o];
          pos[v + 1] = pos[v + 4] = p[o + 1];
          pos[v + 2] = pos[v + 5] = p[o + 2];
          const q = i * 8;
          prev[q] = prev[q + 4] = p[a];
          prev[q + 1] = prev[q + 5] = p[a + 1];
          prev[q + 2] = prev[q + 6] = p[a + 2];
          next[q] = next[q + 4] = p[b];
          next[q + 1] = next[q + 5] = p[b + 1];
          next[q + 2] = next[q + 6] = p[b + 2];
        }
      }
      posVB.updateDirectly(pos, 0);
      prevBuf.updateDirectly(prev, 0);
      nextBuf.updateDirectly(next, 0);
    },
    dispose() {
      prevBuf.dispose();
      nextBuf.dispose();
    },
  };
}
