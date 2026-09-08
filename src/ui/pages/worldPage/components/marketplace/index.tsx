import './style.less';
import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemTooltip } from '../../../../components/itemTooltip';
import { CATEGORIES, displayName } from '../../../../../marketplace/categories';
import {
  Marketplace,
  SORTS,
  formatZen,
  sinceLabel,
  type Tab,
} from '../../../../../marketplace/state';
import type { Listing } from '../../../../../marketplace/mockListings';

export const MARKETPLACE_ID = 'marketplace';
export const MARKETPLACE_WIDTH = 840;
export const MARKETPLACE_HEIGHT = 520;

const TABS: { id: Tab; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'mine', label: 'My Listings' },
  { id: 'sell', label: 'Sell' },
];

/** Price against the going rate, which is the number that says "deal". */
function dealDelta(listing: Listing): { label: string; tone: string } | null {
  if (!listing.median) return null;
  const ratio = listing.price / listing.median;
  const pct = Math.round((ratio - 1) * 100);
  if (pct <= -12) return { label: `${pct}%`, tone: 'is-good' };
  if (pct >= 15) return { label: `+${pct}%`, tone: 'is-bad' };
  return null;
}

const ListingCard = observer(({ listing, mode }: { listing: Listing; mode: Tab }) => {
  const affordable = Marketplace.canAfford(listing);
  const deal = dealDelta(listing);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) =>
    Marketplace.hover(listing.id, e.clientX, e.clientY);

  return (
    <div
      className="mp-card"
      onPointerMove={onMove}
      onPointerEnter={onMove}
      onPointerLeave={() => Marketplace.unhover(listing.id)}
    >
      <div className="mp-card-icon">
        <ItemIcon item={listing.item} />
      </div>

      <div className="mp-card-body">
        <div
          className={`mp-card-name${listing.item.isAncient ? ' is-ancient' : ''}${
            listing.item.isExcellent && !listing.item.isAncient ? ' is-excellent' : ''
          }`}
        >
          {displayName(listing.item)}
        </div>
        <div className="mp-card-meta">
          <span className="mp-card-seller">
            {listing.seller}
            <span className="mp-dot">.</span>
            {sinceLabel(listing.listedAt)}
          </span>
          {deal && <span className={`mp-deal ${deal.tone}`}>{deal.label}</span>}
        </div>
        <div className="mp-card-foot">
          <span className={`mp-price${affordable ? '' : ' is-short'}`}>
            {formatZen(listing.price)}
            <span className="mp-zen">Zen</span>
          </span>

          {mode === 'mine' ? (
            <button
              className="mp-btn is-quiet"
              onClick={() => Marketplace.cancelListing(listing.id)}
            >
              Cancel
            </button>
          ) : (
            <button
              className="mp-btn"
              disabled={!affordable}
              onClick={() => Marketplace.askBuy(listing)}
            >
              {affordable ? 'Buy' : 'Short'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

const CategoryRail = observer(() => {
  const counts = Marketplace.categoryCounts;
  return (
    <div className="mp-rail">
      {CATEGORIES.map(c => (
        <button
          key={c.id}
          className={`mp-rail-item${Marketplace.category === c.id ? ' is-on' : ''}`}
          onClick={() => Marketplace.setCategory(c.id)}
        >
          <span>{c.label}</span>
          <span className="mp-rail-count">{counts[c.id] ?? 0}</span>
        </button>
      ))}
    </div>
  );
});

const Toolbar = observer(() => (
  <div className="mp-toolbar">
    <select
      className="mp-select"
      value={Marketplace.sort}
      onChange={e => Marketplace.setSort(e.target.value as (typeof SORTS)[number]['id'])}
    >
      {SORTS.map(s => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>

    <button
      className={`mp-chip${Marketplace.excellentOnly ? ' is-on' : ''}`}
      onClick={() => Marketplace.toggleExcellentOnly()}
    >
      Excellent
    </button>
    <button
      className={`mp-chip${Marketplace.affordableOnly ? ' is-on' : ''}`}
      onClick={() => Marketplace.toggleAffordableOnly()}
    >
      I can afford
    </button>

    <span className="mp-count">{Marketplace.matching.length} listings</span>
  </div>
));

const Pager = observer(() => {
  const { page, pageCount } = Marketplace;
  return (
    <div className="mp-pager">
      <button className="mp-page-btn" disabled={page <= 0} onClick={() => Marketplace.setPage(page - 1)}>
        Prev
      </button>
      <span className="mp-page-label">
        Page {page + 1} / {pageCount}
      </span>
      <button
        className="mp-page-btn"
        disabled={page >= pageCount - 1}
        onClick={() => Marketplace.setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
});

const SellTab = observer(() => {
  const { inventory, sellPick } = Marketplace;
  const picked = sellPick === null ? null : inventory[sellPick];

  return (
    <div className="mp-sell">
      <div className="mp-sell-head">Pick something from your inventory</div>

      <div className="mp-sell-grid">
        {inventory.length === 0 && <div className="mp-empty">Nothing here to sell.</div>}
        {inventory.map((item, i) => (
          <button
            key={`${item.group}-${item.num}-${i}`}
            className={`mp-sell-slot${sellPick === i ? ' is-on' : ''}`}
            onClick={() => Marketplace.pickForSale(sellPick === i ? null : i)}
            title={displayName(item)}
          >
            <ItemIcon item={item} />
          </button>
        ))}
      </div>

      {picked && (
        <div className="mp-sell-form">
          <div className="mp-sell-picked">
            <div className="mp-card-icon">
              <ItemIcon item={picked} />
            </div>
            <div className="mp-card-name">{displayName(picked)}</div>
          </div>

          <label className="mp-sell-price">
            <span>Price</span>
            <input
              className="mp-input"
              inputMode="numeric"
              value={Marketplace.sellPrice}
              placeholder="0"
              onChange={e => Marketplace.setSellPrice(e.target.value)}
            />
            <span className="mp-zen">Zen</span>
          </label>

          <button
            className="mp-btn is-wide"
            disabled={Marketplace.sellPriceValue <= 0}
            onClick={() => Marketplace.listForSale()}
          >
            List it
          </button>

          <p className="mp-note">
            The item is handed to the market at the trading post and held until it sells.
          </p>
        </div>
      )}
    </div>
  );
});

const ConfirmDialog = observer(() => {
  const listing = Marketplace.confirming;
  if (!listing) return null;
  return (
    // Outside `.mp-body`, so it needs its own no-drag mark: the window's
    // pointerdown otherwise captures the pointer and the click never lands.
    <div className="mp-modal" data-no-drag>
      <div className="mp-modal-box">
        <div className="mp-modal-title">Buy this?</div>
        <div className="mp-modal-item">
          <div className="mp-card-icon">
            <ItemIcon item={listing.item} />
          </div>
          <div>
            <div className="mp-card-name">{displayName(listing.item)}</div>
            <div className="mp-card-meta">from {listing.seller}</div>
          </div>
        </div>
        <div className="mp-modal-price">
          {formatZen(listing.price)} <span className="mp-zen">Zen</span>
        </div>
        <div className="mp-modal-buttons">
          <button className="mp-btn" onClick={() => Marketplace.confirmBuy()}>
            Confirm
          </button>
          <button className="mp-btn is-quiet" onClick={() => Marketplace.cancelBuy()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

export const MarketplaceWindow = observer(() => {
  const chrome = useWindowChrome(MARKETPLACE_ID, {
    width: MARKETPLACE_WIDTH,
    height: MARKETPLACE_HEIGHT,
    onClose: () => Marketplace.close(),
  });

  const { flash } = Marketplace;
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => Marketplace.clearFlash(), 2200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (!Marketplace.open) return null;

  const hovered = Marketplace.hoveredListing;
  const cards = Marketplace.pageItems;
  const browsing = Marketplace.tab !== 'sell';

  return (
    <div
      ref={chrome.ref as (el: HTMLDivElement | null) => void}
      role="dialog"
      aria-label="Marketplace"
      tabIndex={-1}
      className="mp-window"
      onPointerDown={chrome.onPointerDown}
      style={chrome.style}
    >
      <header className="mp-header">
        <h2 className="mp-title">Marketplace</h2>

        <input
          data-no-drag
          className="mp-input mp-search"
          placeholder="Search items or sellers"
          value={Marketplace.search}
          onChange={e => Marketplace.setSearch(e.target.value)}
        />

        <div className="mp-wallet">
          {formatZen(Marketplace.zen)} <span className="mp-zen">Zen</span>
        </div>

        <button data-no-drag className="mp-close" onClick={() => Marketplace.close()}>
          x
        </button>
      </header>

      <nav className="mp-tabs" data-no-drag>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`mp-tab${Marketplace.tab === tab.id ? ' is-on' : ''}`}
            onClick={() => Marketplace.setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mp-body" data-no-drag>
        {Marketplace.tab === 'browse' && <CategoryRail />}

        <section className={`mp-content${Marketplace.tab === 'browse' ? '' : ' is-wide'}`}>
          {browsing ? (
            <>
              <Toolbar />
              <div className="mp-grid">
                {cards.map(listing => (
                  <ListingCard key={listing.id} listing={listing} mode={Marketplace.tab} />
                ))}
                {cards.length === 0 && <div className="mp-empty">Nothing matches that.</div>}
              </div>
              <Pager />
            </>
          ) : (
            <SellTab />
          )}
        </section>
      </div>

      {flash && <div className="mp-flash">{flash}</div>}

      <ConfirmDialog />

      {hovered && Marketplace.hovered && !Marketplace.confirming && (
        <ItemTooltip
          item={hovered.item}
          x={Marketplace.hovered.x}
          y={Marketplace.hovered.y}
          context="plain"
        />
      )}
    </div>
  );
});
