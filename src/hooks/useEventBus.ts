import { useEffect, useRef } from 'react';
import type { Events } from '../libs/eventBus/events';
import { EventBus } from '../libs/eventBus';

/**
 * Subscribes to one `EventBus` event for the component's lifetime. The
 * latest `callback` is always the one called, without re-subscribing on
 * every render.
 */
export function useEventBus<TKey extends keyof Events>(
  evName: TKey,
  callback: (data: Events[TKey]) => any
) {
  const callbackRef = useRef(callback);

  // Assigned in an effect, not during render, so a render that is thrown
  // away (StrictMode, Suspense) never leaks its closure into the listener.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const listener = (data: Events[TKey]) => {
      callbackRef.current(data);
    };
    EventBus.on(evName, listener);

    return () => {
      EventBus.off(evName, listener);
    };
  }, [evName]);
}
