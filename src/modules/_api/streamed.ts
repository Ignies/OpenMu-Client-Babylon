// What a streamed module's file exports (readme.md, "Streaming"). Imports nothing of the game: a module
// bundles this file (and `guest.ts`) into its one file.
import type { ComponentType } from 'react';
import type { ModuleApi, RemoteModuleApi } from './contract';
import { connectModule } from './guest';

/** A streamed module: the API range it needs and its install, which awaits every call so it runs both ways. */
export type StreamedModule = {
  api: string;
  /** `where`: 'page' in process (a window may `draw`), 'frame' in the sandbox (its own document is the window). */
  install(api: ModuleApi<ComponentType> | RemoteModuleApi, where: 'page' | 'frame'): void | Promise<void>;
};

/**
 * The file's default export. In process the client calls `install(api, 'page')`; in the
 * sandbox the frame's page calls `install(connect(port), 'frame')`, the same calls over messages.
 */
export function defineStreamedModule(def: StreamedModule): StreamedModule & { connect: typeof connectModule } {
  return { ...def, connect: connectModule };
}
