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
 * The frame's page for a downloaded module (`streamed.ts` format): it waits for the parent's hand-over,
 * then imports the module from a `data:` URL (an opaque origin has no URL of its own to load from) and
 * calls `install(connect(port), 'frame')`. The code travels as base64, so nothing in it can end the script.
 */
export function sandboxPage(code: Uint8Array): string {
  let text = '';
  for (let i = 0; i < code.length; i += 0x8000) text += String.fromCharCode(...code.subarray(i, i + 0x8000));
  const script = `let taken = false;
addEventListener('message', async e => {
  if (taken || e.source !== parent || !e.data || e.data.muModuleApi !== ${PROTOCOL_VERSION} || !e.ports || !e.ports[0]) return;
  taken = true;
  const m = (await import('data:text/javascript;base64,${btoa(text)}')).default;
  await m.install(m.connect(e.ports[0]), 'frame');
});`;
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style><script>${script}</script>`;
}

/**
 * Hands the module its end of a fresh channel (call once the frame has loaded, with its `contentWindow`)
 * and returns the client's end for `serveModule`. `'*'` because an opaque origin has no name to target.
 */
export function handOverPort(frame: { postMessage(message: unknown, targetOrigin: string, transfer: Transferable[]): void }): MessagePort {
  const { port1, port2 } = new MessageChannel();
  frame.postMessage(HAND_OVER, '*', [port2]);
  return port1;
}
