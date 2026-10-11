import { describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const data = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.localStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
  // A profile saved before the window menu took U: every action written out, the session panel on U.
  data.set('mu_keys:Saved', JSON.stringify({ sessionStats: 'KeyU', inventory: 'KeyI' }));
  return data;
});

const { KeyBindings, setKeyProfile } = await import('./keyBindings');

// NewUIHotKey.cpp:243-247: U toggles INTERFACE_WINDOW_MENU. The session panel is ours and takes
// F6, a key no handler of the original reads (NewUIHotKey.cpp, ZzzInterface.cpp).
describe('the window menu key', () => {
  it('is U, and the session panel is F6', () => {
    expect(KeyBindings.windowMenu).toBe('KeyU');
    expect(KeyBindings.sessionStats).toBe('F6');
  });

  it('moves a saved session panel off U', () => {
    setKeyProfile('Saved');
    expect(KeyBindings.sessionStats).toBe('F6');
    expect(KeyBindings.windowMenu).toBe('KeyU');
    expect(KeyBindings.inventory).toBe('KeyI');
    setKeyProfile('');
    expect(store.size).toBe(1);
  });
});
