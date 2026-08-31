// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
//
// Changes for the MU grid (an 8-connected 256×256 tile map, the original's
// `PathFinding2`):
//  - the default heuristic is octile (admissible for diagonal moves at
//    √2; manhattan over-estimated and made the hero zig-zag),
//  - a diagonal step is only offered when both tiles it cuts past are
//    walkable, so a path never squeezes between two blocked corners (the
//    server refuses that step and rubber-bands the walker),
//  - the search stops after `maxExpansions` closed nodes and returns the
//    path to the closest node seen so far, so a click into a walled-off
//    region costs a bounded amount and still walks the hero toward it.

type Pos = { x: number; y: number };

/** `sqrt(2) - 1`: the extra a diagonal step costs over two orthogonal ones. */
const OCTILE_D2 = Math.SQRT2 - 1;

/**
 * Closed nodes a single search may expand before it gives up and returns the
 * closest node found. Every tile of the map is 65 536; a realistic click is a
 * few hundred, and the original's `PathFinding2` bounds itself to a similar
 * window around the walker.
 */
const DEFAULT_MAX_EXPANSIONS = 8192;

function pathTo(node: GridNode) {
  let curr = node;
  const path: GridNode[] = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(node => node.f);
}

export type AStarOptions = {
  /**
   * Return the path to the closest node when the target is unreachable (or
   * the expansion cap is hit) instead of an empty path.
   */
  closest?: boolean;
  /** Heuristic (see `astar.heuristics`); octile by default. */
  heuristic?: (a: Pos, b: Pos) => number;
  /** Closed-node cap for this search; `DEFAULT_MAX_EXPANSIONS` by default. */
  maxExpansions?: number;
};

const astar = {
  /**
   * Perform an A* Search on a graph given a start and end node.
   */
  search(
    graph: Graph,
    start: GridNode,
    end: GridNode,
    options: AStarOptions = {}
  ) {
    graph.cleanDirty();
    const heuristic = options.heuristic || astar.heuristics.octile;
    const closest = options.closest || false;
    const maxExpansions = options.maxExpansions ?? DEFAULT_MAX_EXPANSIONS;

    const openHeap = getHeap();
    let closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    let expansions = 0;

    while (openHeap.size() > 0) {
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      const currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      if (++expansions > maxExpansions) break;

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      const neighbors = graph.neighbors(currentNode);

      for (let i = 0, il = neighbors.length; i < il; ++i) {
        const neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        const gScore = currentNode.g + neighbor.getCost(currentNode);
        const beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {
          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (
              neighbor.h < closestNode.h ||
              (neighbor.h === closestNode.h && neighbor.g < closestNode.g)
            ) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan(pos0: Pos, pos1: Pos) {
      const d1 = Math.abs(pos1.x - pos0.x);
      const d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    /**
     * Exact distance on an 8-connected grid with diagonals at √2:
     * `max + (√2 − 1)·min` — the `min` diagonal steps cost √2 each and the
     * remaining `max − min` are straight. (`d1 + d2 + …` over-estimated and
     * made A* inadmissible.)
     */
    octile(pos0: Pos, pos1: Pos) {
      const d1 = Math.abs(pos1.x - pos0.x);
      const d2 = Math.abs(pos1.y - pos0.y);
      return Math.max(d1, d2) + OCTILE_D2 * Math.min(d1, d2);
    },
    /** Kept under its old name; identical to `octile`. */
    diagonal(pos0: Pos, pos1: Pos) {
      return astar.heuristics.octile(pos0, pos1);
    },
  },
  cleanNode(node: GridNode) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  },
};

/**
 * A graph memory structure
 * @param {Array} gridIn 2D array of input weights
 * @param {Object} [options]
 * @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
 */
class Graph {
  readonly diagonal: boolean;
  readonly nodes: GridNode[] = [];
  readonly grid: GridNode[][] = [];

  private dirtyNodes: GridNode[] = [];
  /** Scratch for `neighbors`: at most 8 entries, reused between calls. */
  private readonly neighborScratch: GridNode[] = [];

  constructor(gridIn: number[][], options: { diagonal?: boolean } = {}) {
    this.diagonal = !!options.diagonal;

    for (let x = 0; x < gridIn.length; x++) {
      this.grid[x] = [];

      for (let y = 0, row = gridIn[x]; y < row.length; y++) {
        const node = new GridNode(x, y, row[y]);
        this.grid[x][y] = node;
        this.nodes.push(node);
      }
    }
    this.init();
  }

  private init(): void {
    this.dirtyNodes = [];
    for (let i = 0; i < this.nodes.length; i++) {
      astar.cleanNode(this.nodes[i]);
    }
  }

  cleanDirty() {
    for (let i = 0; i < this.dirtyNodes.length; i++) {
      astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
  }

  markDirty(node: GridNode): void {
    this.dirtyNodes.push(node);
  }

  /**
   * The walkable-or-not tiles around `node`. Diagonals are offered only when
   * neither tile they cut between is a wall (`PathFinding2`'s rule; the
   * server walks the same way). The returned array is scratch, valid until
   * the next call.
   */
  neighbors(node: GridNode) {
    const ret = this.neighborScratch;
    ret.length = 0;
    const x = node.x;
    const y = node.y;
    const grid = this.grid;

    const colW = grid[x - 1];
    const colE = grid[x + 1];
    const col = grid[x];

    const west = colW ? colW[y] : undefined;
    const east = colE ? colE[y] : undefined;
    const south = col ? col[y - 1] : undefined;
    const north = col ? col[y + 1] : undefined;

    if (west) ret.push(west);
    if (east) ret.push(east);
    if (south) ret.push(south);
    if (north) ret.push(north);

    if (this.diagonal) {
      const openW = !!west && !west.isWall();
      const openE = !!east && !east.isWall();
      const openS = !!south && !south.isWall();
      const openN = !!north && !north.isWall();

      // Southwest
      if (openW && openS && colW[y - 1]) ret.push(colW[y - 1]);
      // Southeast
      if (openE && openS && colE[y - 1]) ret.push(colE[y - 1]);
      // Northwest
      if (openW && openN && colW[y + 1]) ret.push(colW[y + 1]);
      // Northeast
      if (openE && openN && colE[y + 1]) ret.push(colE[y + 1]);
    }

    return ret;
  }

  toString() {
    const graphString = [];
    const nodes = this.grid;
    for (let x = 0; x < nodes.length; x++) {
      const rowDebug = [];
      const row = nodes[x];
      for (let y = 0; y < row.length; y++) {
        rowDebug.push(row[y].weight);
      }
      graphString.push(rowDebug.join(' '));
    }
    return graphString.join('\n');
  }
}

class GridNode<TValue = number> {
  f = 0;
  g = 0;
  h = 0;
  visited = false;
  closed = false;
  parent: GridNode<TValue> | null = null;

  constructor(readonly x: number, readonly y: number, public weight: TValue) {}

  toString() {
    return '[' + this.x + ' ' + this.y + ']';
  }

  getCost(fromNeighbor?: GridNode) {
    const weight = this.weight as unknown as number;
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
      return weight * Math.SQRT2;
    }
    return weight;
  }

  isWall() {
    return this.weight === 0;
  }
}

class BinaryHeap {
  readonly content: GridNode[] = [];

  constructor(readonly scoreFunction: (node: GridNode) => number) {}

  push(element: GridNode) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  }

  pop() {
    // Store the first element so we can return it later.
    const result = this.content[0];
    // Get the element at the end of the array.
    const end = this.content.pop();

    if (end == null) throw new Error();

    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  remove(node: GridNode) {
    const i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    const end = this.content.pop();

    if (end == null) throw new Error();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node: GridNode) {
    this.sinkDown(this.content.indexOf(node));
  }

  sinkDown(n: number) {
    // Fetch the element that has to be sunk.
    const element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  }

  bubbleUp(n: number) {
    // Look up the target element and its score.
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      const child2N = (n + 1) << 1;
      const child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      let swap = null;
      let child1Score: number | undefined;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score!)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
}

export { astar, Graph, GridNode };
