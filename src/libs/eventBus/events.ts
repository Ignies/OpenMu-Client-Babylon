import type { IVector2Like, IVector3Like } from '../babylon/exports';
import type {
  ConnectServerPackets,
  ENUM_WORLD,
  ServerToClientPackets,
} from '../../common';
import type { Entity } from '../../ecs/world';
import type { With } from 'miniplex';

type CSPacketKeys = (typeof ConnectServerPackets)[number]['Name'];
type GSPacketKeys = (typeof ServerToClientPackets)[number]['Name'];

export type CSEvents = Record<CSPacketKeys, DataView>;
export type GSEvents = Record<GSPacketKeys, DataView>;

export type Events = CSEvents &
  GSEvents & {
    wsOpened: { socket: WebSocket };
    wsClosed: { socket: WebSocket };
    wsError: { socket: WebSocket; error: any };
    groundPointClicked: { point: IVector3Like };
    requestWarp: { map: ENUM_WORLD; pos?: { x: number; y: number } };
    warpCompleted: { map: ENUM_WORLD };
    /** The terrain of `map` could not be loaded; the previous map is still up. */
    warpFailed: { map: ENUM_WORLD; error: unknown };
    objectDamaged: {
      entity: With<Entity, 'transform' | 'screenPosition'>;
      healthDamage: number;
      shieldDamage: number;
      kind: number;
      isDouble: boolean;
      isTriple: boolean;
    };
    /** Server asked to show an effect on an object (level-up beam, shield potion/lost). */
    objectEffect: {
      entity: With<Entity, 'transform'>;
      effect: 'levelUp' | 'shieldPotion' | 'shieldLost' | 'swirl';
    };
    /** Local player gained experience (already applied to Store.playerData). */
    experienceGained: { added: number; killedNetId: number };
    /** ObjectMessage (0x01): a speech bubble line from an object in scope. */
    objectMessage: { netId: number; message: string };
    /** ChatMessage (0x00): a player's chat line, addressed by name (`AssignChat`). */
    chatMessage: { sender: string; message: string; whisper: boolean };
    /** PlayFanfareSound (0x0F): an event sound at a map position (0 ready / 1 start / 2 end — logic.ts plays it). */
    fanfare: { effectType: number; x: number; y: number };
    keyPressed: string;
    keyReleased: string;
    pageVisibilityChanged: boolean;
  };
