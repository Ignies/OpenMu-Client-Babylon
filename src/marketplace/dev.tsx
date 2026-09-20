/**
 * Standalone harness for the marketplace window.
 *
 * `bun run dev`, then open `/marketplace.html`. It mounts the window on its
 * own against fixture data - no login, no game socket, no world - so the
 * layout can be judged before any of the service behind it exists. A mock
 * plays both the service and the game server (`mockService.ts`), so every
 * flow - list, buy, cancel, collect - can be walked through with fake tokens.
 *
 * The version bootstrap is the same two awaits `main.tsx` does, and for the
 * same reason: the window draws the game's own tooltips, which read the packet
 * layer, and that is only assigned once a version is loaded. Everything after
 * it is a dynamic import so nothing in that graph is touched too early.
 *
 * Dev only. It is not an entry in the production build.
 */
import '../style.less';
import { loadGameVersion, versionIdForTag } from '../version';

async function bootstrap() {
  await loadGameVersion(versionIdForTag('season6'));

  const [React, ReactDOM, state, mock, window_] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./state'),
    import('./mockService'),
    import('../ui/pages/worldPage/components/marketplace'),
  ]);
  const { Marketplace } = state;

  // The harness exists to look at the window, so it always has fixtures.
  Marketplace.seedFixtures();
  // Drawn off the catalogue rather than generated apart from it, so every item
  // in the bag has something to compare against on the sell tab.
  const inventory = Marketplace.listings
    .filter((_, i) => i % 7 === 0)
    .slice(0, 24)
    .map((l, i) => ({ item: l.item, slot: 12 + i }));

  Marketplace.attach(
    mock.createMockMarket(Marketplace, {
      listings: Marketplace.listings,
      history: Marketplace.history,
    })
  );
  Marketplace.syncFromGame(184_500_000, inventory, 'Harness');
  Marketplace.open = true;
  void Marketplace.refresh();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div className="app">
        <window_.MarketplaceWindow />
      </div>
    </React.StrictMode>
  );

  // In game the window anchors above the bottom bar. Here there is no bar, so
  // it is centred instead: the harness exists to look at the panel.
  const { MuWindows } = await import('../ui/components/muWindow/windowState');
  requestAnimationFrame(() =>
    MuWindows.moveTo(
      window_.MARKETPLACE_ID,
      Math.round((innerWidth - window_.MARKETPLACE_WIDTH) / 2),
      Math.round((innerHeight - window_.MARKETPLACE_HEIGHT) / 2)
    )
  );
}

bootstrap().catch(e => {
  console.error('marketplace harness failed:', e);
  throw e;
});
