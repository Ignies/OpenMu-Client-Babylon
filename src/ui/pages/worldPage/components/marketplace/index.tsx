import './style.less';
import { useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemTooltip } from '../../../../components/itemTooltip';
import { t, type TextKey } from '../../../../../i18n';
import { CATEGORIES, displayName } from '../../../../../marketplace/categories';
import {
  Marketplace,
  SORTS,
  formatZen,
  sinceLabel,
  type Tab,
} from '../../../../../marketplace/state';
import type { Listing } from '../../../../../marketplace/mockListings';
import { CONTENT, FRAME_H, FRAME_SRC, FRAME_W, PLAQUE, RAIL } from './layout';

export const MARKETPLACE_ID = 'marketplace';
export const MARKETPLACE_WIDTH = 1000;
export const MARKETPLACE_HEIGHT = Math.round((MARKETPLACE_WIDTH * FRAME_H) / FRAME_W);

const TABS: { id: Tab; labelKey: TextKey }[] = [
  { id: 'browse', labelKey: 'marketplace.tab.browse' },
  { id: 'mine', labelKey: 'marketplace.tab.mine' },
  { id: 'sell', labelKey: 'marketplace.tab.sell' },
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

const nameClass = (item: Listing['item']) =>
  item.isAncient ? ' is-ancient' : item.isExcellent ? ' is-excellent' : '';

/**
 * Nothing to show, and the two reasons for it read very differently: the
 * marketplace not being open yet is not the same as a filter matching nothing.
 */
const EmptyState = observer(() => (
  <div className="mp-empty">
    {Marketplace.isEmpty ? t('marketplace.empty') : t('marketplace.noMatch')}
  </div>
));

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
        <div className={`mp-card-name${nameClass(listing.item)}`}>
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
            <span className="mp-zen">{t('common.zen')}</span>
          </span>

          {mode === 'mine' ? (
            <button
              className="mp-btn is-quiet"
              onClick={() => Marketplace.cancelListing(listing.id)}
            >
              {t('common.cancel')}
            </button>
          ) : (
            <button
              className="mp-btn"
              disabled={!affordable}
              onClick={() => Marketplace.askBuy(listing)}
            >
              {affordable ? t('marketplace.buy') : t('marketplace.short')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/** The same listing as one of the frame's ruled bands. */
const ListingRow = observer(({ listing, mode }: { listing: Listing; mode: Tab }) => {
  const affordable = Marketplace.canAfford(listing);
  const deal = dealDelta(listing);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) =>
    Marketplace.hover(listing.id, e.clientX, e.clientY);

  return (
    <div
      className="mp-row"
      onPointerMove={onMove}
      onPointerEnter={onMove}
      onPointerLeave={() => Marketplace.unhover(listing.id)}
    >
      <div className="mp-row-icon">
        <ItemIcon item={listing.item} />
      </div>

      <div className={`mp-card-name${nameClass(listing.item)}`}>
        {displayName(listing.item)}
      </div>

      <div className="mp-row-seller">{listing.seller}</div>
      <div className="mp-row-age">{sinceLabel(listing.listedAt)}</div>
      <div className="mp-row-deal">
        {deal && <span className={`mp-deal ${deal.tone}`}>{deal.label}</span>}
      </div>

      <div className={`mp-row-price${affordable ? '' : ' is-short'}`}>
        {formatZen(listing.price)}
        <span className="mp-zen">{t('common.zen')}</span>
      </div>

      {mode === 'mine' ? (
        <button className="mp-btn is-quiet" onClick={() => Marketplace.cancelListing(listing.id)}>
          {t('common.cancel')}
        </button>
      ) : (
        <button
          className="mp-btn"
          disabled={!affordable}
          onClick={() => Marketplace.askBuy(listing)}
        >
          {affordable ? t('marketplace.buy') : t('marketplace.short')}
        </button>
      )}
    </div>
  );
});

const Rail = observer(() => {
  const selling = Marketplace.tab === 'sell';
  // On the sell tab the same rail narrows the bag instead of the catalogue.
  const counts = selling ? Marketplace.bagCounts : Marketplace.categoryCounts;
  const { page, pageCount } = Marketplace;

  return (
    <div className="mp-rail" style={RAIL} data-no-drag>
      {Marketplace.tab !== 'mine' && (
        <>
          <div className="mp-rail-list">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`mp-rail-item${Marketplace.category === c.id ? ' is-on' : ''}`}
                onClick={() => Marketplace.setCategory(c.id)}
              >
                <span>{t(c.labelKey)}</span>
                <span className="mp-rail-count">{counts[c.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {!selling && (
            <div className="mp-rail-filters">
              <button
                className={`mp-chip${Marketplace.excellentOnly ? ' is-on' : ''}`}
                onClick={() => Marketplace.toggleExcellentOnly()}
              >
                {t('marketplace.excellentOnly')}
              </button>
              <button
                className={`mp-chip${Marketplace.affordableOnly ? ' is-on' : ''}`}
                onClick={() => Marketplace.toggleAffordableOnly()}
              >
                {t('marketplace.affordable')}
              </button>
            </div>
          )}
        </>
      )}

      {Marketplace.tab !== 'sell' && (
        <div className="mp-rail-foot">
          <div className="mp-count">
            {t('marketplace.listings', { count: Marketplace.matching.length })}
            <span className="mp-page-label">
              {t('marketplace.page', { page: page + 1, total: pageCount })}
            </span>
          </div>
          <div className="mp-pager">
            <button
              className="mp-page-btn"
              disabled={page <= 0}
              onClick={() => Marketplace.setPage(page - 1)}
            >
              {t('marketplace.prev')}
            </button>
            <button
              className="mp-page-btn"
              disabled={page >= pageCount - 1}
              onClick={() => Marketplace.setPage(page + 1)}
            >
              {t('marketplace.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

/** What the same item is already going for, so a price can be judged. */
const MarketRate = observer(() => {
  const rows = Marketplace.comparable;
  const floor = Marketplace.comparableFloor;

  return (
    <div className="mp-rate">
      <div className="mp-panel-head">
        {t('marketplace.onTheMarket')}
        {rows.length > 0 && (
          <span className="mp-rate-count">
            {t('marketplace.listedCount', { count: rows.length })}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mp-rate-none">{t('marketplace.nothingLikeIt')}</div>
      ) : (
        <>
          <div className="mp-rate-floor">
            {t('marketplace.cheapest')} <strong>{formatZen(floor!)}</strong>{' '}
            <span className="mp-zen">{t('common.zen')}</span>
          </div>

          <div className="mp-rate-rows">
            {rows.slice(0, 6).map(l => (
              <div key={l.id} className={`mp-rate-row${l.mine ? ' is-mine' : ''}`}>
                <span className={`mp-rate-name${nameClass(l.item)}`}>{displayName(l.item)}</span>
                <span className="mp-rate-seller">{l.seller}</span>
                <span className="mp-rate-price">{formatZen(l.price)}</span>
              </div>
            ))}
          </div>

          <button
            className="mp-btn is-quiet"
            onClick={() => Marketplace.setSellPrice(String(Math.max(1, floor! - 1)))}
          >
            {t('marketplace.undercut')}
          </button>
        </>
      )}
    </div>
  );
});

const SellTab = observer(() => {
  const { inventory, sellPick } = Marketplace;
  const bag = Marketplace.bagFiltered;
  const picked = sellPick === null ? null : inventory[sellPick];

  return (
    <div className="mp-sell">
      <div className="mp-sell-bag">
        <div className="mp-panel-head">{t('marketplace.yourBag')}</div>
        <div className="mp-sell-grid">
          {bag.length === 0 && (
            <div className="mp-empty">
              {inventory.length === 0
                ? t('marketplace.bagEmpty')
                : t('marketplace.bagNoneOfKind')}
            </div>
          )}
          {bag.map(({ item, index }) => (
            <button
              key={`${item.group}-${item.num}-${index}`}
              className={`mp-sell-slot${sellPick === index ? ' is-on' : ''}`}
              onClick={() => Marketplace.pickForSale(sellPick === index ? null : index)}
              title={displayName(item)}
            >
              <ItemIcon item={item} />
            </button>
          ))}
        </div>
      </div>

      {picked ? (
        <div className="mp-sell-split">
          <MarketRate />

          <div className="mp-sell-form">
            <div className="mp-panel-head">{t('marketplace.yourItem')}</div>

            <div className="mp-sell-picked">
              <div className="mp-card-icon">
                <ItemIcon item={picked} />
              </div>
              <div className={`mp-card-name${nameClass(picked)}`}>{displayName(picked)}</div>
            </div>

            <label className="mp-sell-price">
              <span>{t('marketplace.price')}</span>
              <input
                className="mp-input"
                inputMode="numeric"
                value={Marketplace.sellPrice}
                placeholder="0"
                onChange={e => Marketplace.setSellPrice(e.target.value)}
              />
              <span className="mp-zen">{t('common.zen')}</span>
            </label>

            <button
              className="mp-btn is-wide"
              disabled={Marketplace.sellPriceValue <= 0}
              onClick={() => Marketplace.listForSale()}
            >
              {t('marketplace.listIt')}
            </button>

            <p className="mp-note">{t('marketplace.sellNote')}</p>
          </div>
        </div>
      ) : (
        <div className="mp-empty">{t('marketplace.pickToPrice')}</div>
      )}
    </div>
  );
});

const ConfirmDialog = observer(() => {
  const listing = Marketplace.confirming;
  if (!listing) return null;
  return (
    // Outside the rail and content regions, so it needs its own no-drag mark:
    // the window's pointerdown otherwise captures the pointer and the click
    // never lands.
    <div className="mp-modal" data-no-drag>
      <div className="mp-modal-box">
        <div className="mp-modal-title">{t('marketplace.buyThis')}</div>
        <div className="mp-modal-item">
          <div className="mp-card-icon">
            <ItemIcon item={listing.item} />
          </div>
          <div>
            <div className={`mp-card-name${nameClass(listing.item)}`}>
              {displayName(listing.item)}
            </div>
            <div className="mp-card-meta">
              {t('marketplace.fromSeller', { seller: listing.seller })}
            </div>
          </div>
        </div>
        <div className="mp-modal-price">
          {formatZen(listing.price)} <span className="mp-zen">{t('common.zen')}</span>
        </div>
        <div className="mp-modal-buttons">
          <button className="mp-btn" onClick={() => Marketplace.confirmBuy()}>
            {t('marketplace.confirm')}
          </button>
          <button className="mp-btn is-quiet" onClick={() => Marketplace.cancelBuy()}>
            {t('common.cancel')}
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
      aria-label={t('marketplace.title')}
      tabIndex={-1}
      className="mp-window"
      onPointerDown={chrome.onPointerDown}
      style={{ ...chrome.style, backgroundImage: `url(${FRAME_SRC})` }}
    >
      <header className="mp-plaque" style={PLAQUE}>
        <h2 className="mp-title">{t('marketplace.title')}</h2>

        <nav className="mp-tabs" data-no-drag>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`mp-tab${Marketplace.tab === tab.id ? ' is-on' : ''}`}
              onClick={() => Marketplace.setTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        <div className="mp-wallet">
          {formatZen(Marketplace.zen)} <span className="mp-zen">{t('common.zen')}</span>
        </div>

        <button
          data-no-drag
          className="mp-close"
          aria-label={t('common.close')}
          onClick={() => Marketplace.close()}
        >
          x
        </button>
      </header>

      <Rail />

      <section className="mp-content" style={CONTENT} data-no-drag>
        {browsing && (
          <div className="mp-toolbar">
            <select
              className="mp-select"
              value={Marketplace.sort}
              onChange={e => Marketplace.setSort(e.target.value as (typeof SORTS)[number]['id'])}
            >
              {SORTS.map(s => (
                <option key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>

            <input
              className="mp-input mp-search"
              placeholder={t('marketplace.search')}
              value={Marketplace.search}
              onChange={e => Marketplace.setSearch(e.target.value)}
            />

            <div className="mp-viewswitch">
              <button
                className={`mp-viewbtn${Marketplace.view === 'list' ? ' is-on' : ''}`}
                aria-pressed={Marketplace.view === 'list'}
                title={t('marketplace.listView')}
                onClick={() => Marketplace.setView('list')}
              >
                <svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true">
                  <rect x="0" y="1" width="12" height="2" rx="0.5" fill="currentColor" />
                  <rect x="0" y="5" width="12" height="2" rx="0.5" fill="currentColor" />
                  <rect x="0" y="9" width="12" height="2" rx="0.5" fill="currentColor" />
                </svg>
              </button>
              <button
                className={`mp-viewbtn${Marketplace.view === 'grid' ? ' is-on' : ''}`}
                aria-pressed={Marketplace.view === 'grid'}
                title={t('marketplace.gridView')}
                onClick={() => Marketplace.setView('grid')}
              >
                <svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true">
                  <rect x="0" y="0" width="5" height="5" rx="0.5" fill="currentColor" />
                  <rect x="7" y="0" width="5" height="5" rx="0.5" fill="currentColor" />
                  <rect x="0" y="7" width="5" height="5" rx="0.5" fill="currentColor" />
                  <rect x="7" y="7" width="5" height="5" rx="0.5" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {browsing ? (
          Marketplace.view === 'grid' ? (
            <div className="mp-grid">
              {cards.map(listing => (
                <ListingCard key={listing.id} listing={listing} mode={Marketplace.tab} />
              ))}
              {cards.length === 0 && <EmptyState />}
            </div>
          ) : (
            <div className="mp-list">
              <div className="mp-row mp-row-head">
                <span />
                <span>{t('marketplace.colItem')}</span>
                <span>{t('marketplace.colSeller')}</span>
                <span>{t('marketplace.colListed')}</span>
                <span />
                <span className="mp-row-price-head">{t('marketplace.price')}</span>
                <span />
              </div>
              {cards.map(listing => (
                <ListingRow key={listing.id} listing={listing} mode={Marketplace.tab} />
              ))}
              {cards.length === 0 && <EmptyState />}
            </div>
          )
        ) : (
          <SellTab />
        )}
      </section>

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
