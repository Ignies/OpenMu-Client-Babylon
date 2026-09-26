/**
 * Items linked into chat. Alt+click on an item puts it in the line as `{`,
 * its 12 item bytes in base64url, `}`: 18 plain ASCII characters, which every
 * client and the server pass along. A client reads the item back out of the
 * bytes, shows its name and, on hover, its tooltip.
 *
 * The chat box shows the name in brackets instead of the bytes; `labelsToWire`
 * swaps the names back for their links when the line is sent.
 */

import type { Item } from '../ecs/world';
import { ItemSerializer } from './itemSerializer';
import { itemDef } from './itemStats';
import { itemDisplayName } from './itemTooltip';

/** `{` + 16 characters + `}`. */
export const ITEM_LINK_LENGTH = 18;

const TOKEN = /\{([A-Za-z0-9_-]{16})\}/g;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/** The link an item is sent as. */
export function itemLinkToken(item: Item): string {
  const bytes = new Uint8Array(ItemSerializer.NeededSpace);
  ItemSerializer.SerializeItem(bytes, item);
  // The 380 option is only in the bytes the server sent, not on the item.
  if (item.raw?.length === bytes.length) bytes[5] |= item.raw[5] & 0x0f;
  return `{${toBase64Url(bytes)}}`;
}

/** The name the chat box and the log show a link as. */
export function itemLinkLabel(item: Item): string {
  return `[${itemDisplayName(item)}]`;
}

// A link is read once, however many rows and balloons draw it.
const decoded = new Map<string, Item | null>();
const DECODED_MAX = 512;

/** The item a link's 16 characters stand for, or null when they are not one this client knows. */
export function itemFromLink(payload: string): Item | null {
  const known = decoded.get(payload);
  if (known !== undefined) return known;

  let item: Item | null = null;
  try {
    const bytes = fromBase64Url(payload);
    if (bytes.length === ItemSerializer.NeededSpace) {
      const read = ItemSerializer.DeserializeItem(bytes);
      if (itemDef(read.group, read.num)) item = read;
    }
  } catch {
    item = null;
  }

  if (decoded.size >= DECODED_MAX) decoded.delete(decoded.keys().next().value!);
  decoded.set(payload, item);
  return item;
}

export type ItemLinkHit = { start: number; end: number; item: Item };

/** Every readable link in the line, in order. */
export function scanItemLinks(text: string): ItemLinkHit[] {
  const hits: ItemLinkHit[] = [];
  if (!text.includes('{')) return hits;
  for (const m of text.matchAll(TOKEN)) {
    const item = itemFromLink(m[1]);
    if (item) hits.push({ start: m.index!, end: m.index! + m[0].length, item });
  }
  return hits;
}

/** The line without its links, for the word matches that fire emotes: the bytes spell anything. */
export function stripItemLinks(text: string): string {
  if (!text.includes('{')) return text;
  return text.replace(TOKEN, ' ').replace(/\s+/g, ' ').trim();
}

/** The typed line as it is sent: every label of a link in `links` becomes the link. */
export function labelsToWire(text: string, links: ReadonlyMap<string, string>): string {
  let wire = text;
  // Longest first, so a name that holds another is swapped whole.
  const labels = [...links.keys()].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    if (wire.includes(label)) wire = wire.split(label).join(links.get(label)!);
  }
  return wire;
}

/** A sent line back as the chat box shows it, for the history keys. */
export function wireToLabels(wire: string): { text: string; links: Map<string, string> } {
  const links = new Map<string, string>();
  let text = '';
  let at = 0;
  for (const hit of scanItemLinks(wire)) {
    const label = itemLinkLabel(hit.item);
    links.set(label, wire.slice(hit.start, hit.end));
    text += wire.slice(at, hit.start) + label;
    at = hit.end;
  }
  return { text: text + wire.slice(at), links };
}
