import { useEffect, useState } from 'react';
import { loadVersionUi, versionUi } from '../version';
import type { VersionUi } from '../version/uiContract';

/**
 * The active version's UI module for a shared component that has to ask it
 * which art to draw (`muLogo`). Null on the first paint if the chunk is not
 * in yet; the component renders nothing until it is, which is what it
 * already does while a sprite decodes.
 *
 * A screen that is *wholly* the version's is not this - it comes out of
 * `pregame.LoginPage` / `pregame.CharactersPage` through `React.lazy`.
 */
export function useVersionUi(): VersionUi | null {
  const [ui, setUi] = useState(versionUi);

  useEffect(() => {
    if (ui) return;

    let cancelled = false;

    void loadVersionUi().then(loaded => {
      if (!cancelled) setUi(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [ui]);

  return ui;
}
