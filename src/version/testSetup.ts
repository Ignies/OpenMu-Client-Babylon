// Vitest setup: tests import app modules without main.tsx, so give them the
// same boot contract - the default version's core resolved first. UI is not
// loaded; nothing renders version UI under node.
import { DEFAULT_VERSION_ID } from '@versions/registry';
import { loadGameVersion } from './index';

// The client starts in the system language; tests expect English on every machine.
Object.defineProperty(globalThis.navigator, 'language', { value: 'en-US', configurable: true });
Object.defineProperty(globalThis.navigator, 'languages', { value: ['en-US'], configurable: true });

await loadGameVersion(DEFAULT_VERSION_ID);
