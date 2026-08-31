import type { IVector2Like } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';
import { Store } from '../../store';
import { truncatePathForAttack } from './attackSystem';

// Function returning CLIENT CODE (0-7) according to MU Online documentation
// W=0, SW=1, S=2, SE=3, E=4, NE=5, N=6, NW=7

function GetClientDirectionCode(from: IVector2Like, to: IVector2Like): number {
  const dx = ~~(Math.round(to.x) - Math.round(from.x)); // Horizontal (X): left / right – works correctly
  const dy = ~~(Math.round(to.y) - Math.round(from.y)); // Vertical (Y): up / down – correction here

  if (dx === -1 && dy === -1) return 0; // West
  if (dx === 0 && dy === -1) return 1; // South-West
  if (dx === 1 && dy === -1) return 2; // South
  if (dx === 1 && dy === 0) return 3; // South-East
  if (dx === 1 && dy === 1) return 4; // East
  if (dx === 0 && dy === 1) return 5; // North-East
  if (dx === -1 && dy === 1) return 6; // North
  if (dx === -1 && dy === 0) return 7; // North-West
  return 0xff; // Invalid direction
}

function mapToServerDirectionCode(clientDir: number): number {
  return clientDir;
  // return 7 - clientDir;
}

// A WalkRequest carries at most 15 steps (4-bit step count). The server
// (OpenMU Walker) stops at the last step it received, so longer paths have to
// be re-sent in chunks as the hero walks — the original client does the same
// by re-issuing the walk packet while moving (ZzzCharacter.cpp).
const MAX_STEPS_PER_PACKET = 15;

// stackalloc: no GC pressure for  ≤15-step MU packet
const clientDirs = new Array<number>(MAX_STEPS_PER_PACKET);

/**
 * Sends up to 15 steps of `path` starting at `path[startIndex]`.
 * Returns the index of the last path point covered by the packet, or -1 when
 * nothing was sent.
 */
function sendWalkPathToServer(path: IVector2Like[], startIndex: number): number {
  if (path.length <= startIndex + 1) return -1;

  // The server replays the steps from SourceX/Y, so the start tile must be the
  // same tile the direction steps were derived from. The pathfinder and
  // GetClientDirectionCode both round (posToIndex = floor(v + 0.5)); the old
  // `~~` truncation put the server one tile off whenever the hero's fractional
  // position was ≥ .5, and the error accumulated walk after walk until the
  // server's 5-tile tolerance kicked in and rubber-banded us via ObjectMoved.
  //
  // For a fresh walk path[0] is the hero's position when the path was
  // planned (PlayerControllerSystem copies transform.pos into
  // pathfinding.from), i.e. the tile it is logically standing on; for a
  // continuation it is the last tile of the previous segment, where the
  // server's walker stops and waits for the next WalkRequest.
  const startX = Math.round(path[startIndex].x);
  const startY = Math.round(path[startIndex].y);

  let dirLen = 0;
  let lastIndex = startIndex;
  let currentPos = path[startIndex];
  for (let i = startIndex + 1; i < path.length; i++) {
    const step = path[i];
    const dirCode = GetClientDirectionCode(currentPos, step);
    if (dirCode > 7) {
      console.error(
        `Invalid direction code: ${dirCode} at step ${i} from [${currentPos.x}, ${currentPos.y}] to [${step.x}, ${step.y}]`
      );
      break;
    }
    clientDirs[dirLen++] = dirCode;
    currentPos = step;
    lastIndex = i;
    if (dirLen == MAX_STEPS_PER_PACKET) break;
  }
  if (dirLen == 0) return -1;

  // const directionMap = MuGame.Network?.GetDirectionMap();
  const serverDirs = new Array<number>(dirLen);
  for (let i = 0; i < dirLen; i++) {
    const cd = clientDirs[i];
    serverDirs[i] = mapToServerDirectionCode(cd);
  }

  Store.sendWalkPath(startX, startY, serverDirs);
  return lastIndex;
}

export const NetworkSystem: ISystemFactory = world => {
  // Last path point the server knows about (the end of the last sent chunk).
  // MoveAlongPathSystem shifts consumed points off `pathfinding.path`, so we
  // track the point object itself rather than an index.
  let sentUpTo: IVector2Like | undefined;
  let sentPath: IVector2Like[] | undefined;

  return {
    update: () => {
      const playerEntity = world.playerEntity;
      if (!playerEntity) return;

      const { playerMoveTo, pathfinding } = playerEntity;
      const path = pathfinding.path;

      if (playerMoveTo.sendToServer && pathfinding.calculated && path) {
        // Approaching a target: stop the server-side walk where the client
        // stops (in attack range), not on the target's cell.
        if (world.attackTarget?.transform) {
          truncatePathForAttack(path, world.attackTarget);
        }
        const last = sendWalkPathToServer(path, 0);
        sentUpTo = last >= 0 && last < path.length - 1 ? path[last] : undefined;
        sentPath = sentUpTo ? path : undefined;
        playerMoveTo.sendToServer = false;
        return;
      }

      if (!sentUpTo || !sentPath) return;

      // Path was replaced/cleared (new click, ObjectMoved resync, ...): the
      // continuation belongs to a walk that no longer exists.
      if (!pathfinding.calculated || path !== sentPath || path.length === 0) {
        sentUpTo = undefined;
        sentPath = undefined;
        return;
      }

      // Hand the next chunk over when the hero is about to reach the end of
      // the sent one, so the server keeps walking without a visible stop.
      // MoveAlongPathSystem walks at the server's wall-clock pace, so by
      // then the server is at (or within a tile of) that end tile too.
      const idx = path.indexOf(sentUpTo);
      if (idx === -1) {
        // Already walked past it (should not happen, but never strand the
        // server): continue from the current tile.
        const last = sendWalkPathToServer(path, 0);
        sentUpTo = last >= 0 && last < path.length - 1 ? path[last] : undefined;
        if (!sentUpTo) sentPath = undefined;
        return;
      }
      if (idx > 1) return;

      const last = sendWalkPathToServer(path, idx);
      sentUpTo = last >= 0 && last < path.length - 1 ? path[last] : undefined;
      if (!sentUpTo) sentPath = undefined;
    },
  };
};
