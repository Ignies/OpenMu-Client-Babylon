// The frame a third-party module runs in (readme.md): an opaque origin that may run scripts and nothing
// else, and talks to the client only over the port handed to it. Mounting it in the world page is phase 5.
import { PROTOCOL_VERSION } from './protocol';

/** The module's page: inline HTML, or a `blob:` URL the client made from what it downloaded. */
export type FrameSource = { srcdoc: string } | { blob: string };

/**
 * The iframe's attributes (HTML names, for `setAttribute`): scripts only, so never `allow-same-origin`
 * (the page's storage), `allow-top-navigation` or `allow-popups`.
 */
export function sandboxFrame(source: FrameSource): Readonly<Record<string, string>> {
  if ('blob' in source && !source.blob.startsWith('blob:')) throw new Error(`not a blob URL: ${source.blob}`);
  return {
    sandbox: 'allow-scripts',
    ...('srcdoc' in source ? { srcdoc: source.srcdoc } : { src: source.blob }),
    referrerpolicy: 'no-referrer',
  };
}

/** The message the module's page waits for; the port comes as its `ports[0]`. */
export const HAND_OVER = Object.freeze({ muModuleApi: PROTOCOL_VERSION });

/**
 * Hands the module its end of a fresh channel (call once the frame has loaded, with its `contentWindow`)
 * and returns the client's end for `serveModule`. `'*'` because an opaque origin has no name to target.
 */
export function handOverPort(frame: { postMessage(message: unknown, targetOrigin: string, transfer: Transferable[]): void }): MessagePort {
  const { port1, port2 } = new MessageChannel();
  frame.postMessage(HAND_OVER, '*', [port2]);
  return port1;
}
