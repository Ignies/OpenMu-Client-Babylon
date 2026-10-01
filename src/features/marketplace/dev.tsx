// Dev-only standalone harness for the marketplace window, against fixtures and a mock
// service: `bun run dev`, then open `/marketplace.html`. See readme.md.
import '../../app/style.less';
import { loadGameVersion, versionIdForTag } from '../../version';

async function bootstrap() {
  await loadGameVersion(versionIdForTag('season6'));

  const [React, ReactDOM, state, mock, window_] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./state'),
    import('./mockService'),
    import('@versions/shared/ui/windows/marketplace'),
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
  const { MuWindows } = await import('../../controllers/interface/components/mu_window/windowState');
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
