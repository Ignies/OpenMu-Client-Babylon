import { makeAutoObservable, runInAction } from 'mobx';
import * as api from './api';
import type { ApiListing } from './api';
import { CATEGORIES, categoryOf, displayName, type CategoryId } from './categories';
import { buildMockListings, type Listing } from './mockListings';

export type Tab = 'browse' | 'mine' | 'sell';
export type Sort = 'newest' | 'price-asc' | 'price-desc' | 'deal';
export type View = 'list' | 'grid';

export const SORTS: { id: Sort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'deal', label: 'Best deal' },
];

/** A list row is about a third the height of a card, so it fits more of them. */
/** The service speaks in its own rows; the window draws these. */
function fromApi(row: ApiListing): Listing {
  return {
    id: row.id,
    item: row.item as Listing['item'],
    category: categoryOf(row.item as Listing['item']),
    seller: row.seller,
    price: row.price,
    listedAt: row.listedAt,
    // No history to compare against yet, so nothing claims to be a deal.
    median: row.price,
    mine: row.state !== 'active' || undefined,
    state: row.state,
  };
}

export const PAGE_SIZE_GRID = 12;
export const PAGE_SIZE_LIST = 10;

/**
 * Marketplace window state.
 *
 * Deliberately imports no `Store`: the window must be mountable on its own so
 * it can be looked at without a game session (see `marketplace.html`). What it
 * needs from the game - the player's Zen and their inventory - is pushed in
 * from the world page instead.
 *
 * Every listing here is a fixture. The buy and list actions move local state
 * only; nothing talks to a service yet, and no trade is driven.
 */
class MarketplaceStore {
  open = false;
  tab: Tab = 'browse';
  category: CategoryId = 'all';
  search = '';
  sort: Sort = 'newest';
  /**
   * Opens on the list every time, deliberately not remembered: the list is
   * the view that answers "what is for sale and what does it cost", and the
   * grid is for browsing by eye.
   */
  view: View = 'list';
  page = 0;
  excellentOnly = false;
  affordableOnly = false;

  /** Pushed in by the world page; the dev harness sets its own. */
  zen = 0;
  /** What the player could put up for sale. Pushed in the same way. */
  inventory: Listing['item'][] = [];

  /**
   * Empty until a service fills it.
   *
   * The fixtures are for looking at the window, and they must never reach a
   * player: every one of them is invented, so a live build would offer things
   * nobody is selling and take fake Zen for them. Development builds and the
   * standalone harness seed them explicitly instead.
   */
  listings: Listing[] = [];

  /** The card the pointer is over, for the tooltip. */
  hovered: { id: string; x: number; y: number } | null = null;
  /** A purchase the player has clicked but not confirmed. */
  confirming: Listing | null = null;
  /** Set for a moment after a purchase, so the window can say so. */
  flash: string | null = null;
  /** Zen the service is holding for this player, from sales made while away. */
  payoutOwed = 0;

  /** Sell tab: which inventory item is picked, and the price typed for it. */
  sellPick: number | null = null;
  sellPrice = '';

  constructor() {
    makeAutoObservable(this);
    if (APP_STAGE === 'dev') this.seedFixtures();
  }

  /** Fills the catalogue with invented listings. Never call this in a live build. */
  seedFixtures(): void {
    this.listings = buildMockListings();
  }

  /** No listings at all, as opposed to none matching the current filters. */
  get isEmpty(): boolean {
    return this.listings.length === 0;
  }

  /**
   * Whether a service is answering.
   *
   * `live` is the real marketplace. `offline` is the standalone harness and a
   * development build with nothing running behind them, where the fixtures
   * stand in. A live build that cannot reach the service stays offline with an
   * empty catalogue rather than inventing one.
   */
  mode: 'unknown' | 'live' | 'offline' = 'unknown';
  /** Set when the service refuses or cannot be reached, for the window to show. */
  problem: string | null = null;
  loading = false;

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.page = 0;
      void this.refresh();
    } else {
      this.closeTransients();
    }
  }

  /**
   * Pulls the catalogue and this player's own listings from the service.
   *
   * The window shows what the service holds and nothing else: no optimistic
   * rows, no local edits that survive a reload. Every action below re-reads
   * rather than patching state, because the service is the only thing that
   * knows whether a bot actually completed a handover.
   */
  async refresh(): Promise<void> {
    if (this.mode === 'offline') return;

    runInAction(() => {
      this.loading = true;
    });

    try {
      const [catalogue, own] = await Promise.all([api.browse({ limit: 200 }), api.mine()]);
      runInAction(() => {
        this.mode = 'live';
        this.problem = null;
        this.listings = [...catalogue.listings, ...own.listings].map(fromApi);
        this.payoutOwed = own.balance;
        this.loading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.loading = false;
        // In a development build the fixtures are the point, so a service that
        // is not running is not an error - it is the harness.
        if (APP_STAGE === 'dev' && this.listings.length > 0) {
          this.mode = 'offline';
          return;
        }
        this.mode = 'live';
        this.problem = error instanceof Error ? error.message : 'The marketplace is unreachable.';
      });
    }
  }

  close(): void {
    this.open = false;
    this.closeTransients();
  }

  private closeTransients(): void {
    this.hovered = null;
    this.confirming = null;
  }

  setTab(tab: Tab): void {
    // The sell tab shares the category rail, but it opens on everything you
    // carry: arriving at it with a bag filtered to whatever you last browsed
    // reads as an empty bag.
    if (tab === 'sell') this.category = 'all';
    this.tab = tab;
    this.page = 0;
    this.confirming = null;
  }

  setCategory(category: CategoryId): void {
    this.category = category;
    this.page = 0;
  }

  setSearch(search: string): void {
    this.search = search;
    this.page = 0;
  }

  setSort(sort: Sort): void {
    this.sort = sort;
    this.page = 0;
  }

  setView(view: View): void {
    if (this.view === view) return;
    // Keep the player roughly where they were rather than snapping to page 1:
    // the two views hold different numbers of listings per page.
    const firstIndex = this.page * this.pageSize;
    this.view = view;
    this.page = Math.floor(firstIndex / this.pageSize);
    this.setPage(this.page);
  }

  get pageSize(): number {
    return this.view === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  }

  toggleExcellentOnly(): void {
    this.excellentOnly = !this.excellentOnly;
    this.page = 0;
  }

  toggleAffordableOnly(): void {
    this.affordableOnly = !this.affordableOnly;
    this.page = 0;
  }

  setPage(page: number): void {
    this.page = Math.max(0, Math.min(page, this.pageCount - 1));
  }

  hover(id: string, x: number, y: number): void {
    this.hovered = { id, x, y };
  }

  unhover(id: string): void {
    if (this.hovered?.id === id) this.hovered = null;
  }

  /** How many listings sit in each rail, for the counts beside the labels. */
  get categoryCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: 0 };
    for (const c of CATEGORIES) counts[c.id] = 0;
    for (const l of this.listings) {
      counts.all++;
      counts[l.category] = (counts[l.category] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * The bag under the same category rail the catalogue uses, carrying each
   * item's real inventory index so picking one still addresses the bag.
   */
  get bagFiltered(): { item: Listing['item']; index: number }[] {
    return this.inventory
      .map((item, index) => ({ item, index }))
      .filter(e => this.category === 'all' || categoryOf(e.item) === this.category);
  }

  get bagCounts(): Record<string, number> {
    const counts: Record<string, number> = { all: this.inventory.length };
    for (const c of CATEGORIES) counts[c.id] ??= 0;
    for (const item of this.inventory) {
      const id = categoryOf(item);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }

  get matching(): Listing[] {
    const needle = this.search.trim().toLowerCase();
    const pool = this.tab === 'mine' ? this.listings.filter(l => l.mine) : this.listings;

    const filtered = pool.filter(l => {
      if (this.tab === 'browse' && this.category !== 'all' && l.category !== this.category) {
        return false;
      }
      if (this.excellentOnly && !l.item.isExcellent && !l.item.isAncient) return false;
      if (this.affordableOnly && l.price > this.zen) return false;
      if (needle && !displayName(l.item).toLowerCase().includes(needle)) {
        if (!l.seller.toLowerCase().includes(needle)) return false;
      }
      return true;
    });

    const sorted = filtered.slice();
    switch (this.sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'deal':
        sorted.sort((a, b) => a.price / a.median - b.price / b.median);
        break;
      default:
        sorted.sort((a, b) => b.listedAt - a.listedAt);
    }
    return sorted;
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.matching.length / this.pageSize));
  }

  get pageItems(): Listing[] {
    const start = Math.min(this.page, this.pageCount - 1) * this.pageSize;
    return this.matching.slice(start, start + this.pageSize);
  }

  get hoveredListing(): Listing | null {
    if (!this.hovered) return null;
    return this.listings.find(l => l.id === this.hovered!.id) ?? null;
  }

  canAfford(listing: Listing): boolean {
    return this.zen >= listing.price;
  }

  askBuy(listing: Listing): void {
    this.confirming = listing;
  }

  cancelBuy(): void {
    this.confirming = null;
  }

  /**
   * Fixture purchase: the Zen and the listing move locally so the flow can be
   * walked end to end. The real one is a trade the game server performs.
   */
  /**
   * Reserves the listing. Nothing is bought here and no Zen moves: the service
   * holds it for this buyer, and a bot then meets them in game to make the
   * exchange. That is the only place goods actually change hands.
   */
  async confirmBuy(): Promise<void> {
    const listing = this.confirming;
    if (!listing || !this.canAfford(listing)) return;

    if (this.mode === 'offline') {
      // The harness has no service to reserve anything with.
      this.zen -= listing.price;
      this.listings = this.listings.filter(l => l.id !== listing.id);
      this.confirming = null;
      this.flash = `Bought ${displayName(listing.item)}`;
      this.setPage(this.page);
      return;
    }

    runInAction(() => {
      this.confirming = null;
    });

    try {
      await api.claim(listing.id);
      runInAction(() => {
        this.flash = `Reserved ${displayName(listing.item)}. A trader is on the way.`;
      });
    } catch (error) {
      runInAction(() => {
        this.flash = error instanceof Error ? error.message : 'That purchase was refused.';
      });
    }
    await this.refresh();
  }

  async cancelListing(id: string): Promise<void> {
    const listing = this.listings.find(l => l.id === id);
    if (!listing) return;

    if (this.mode === 'offline') {
      this.listings = this.listings.filter(l => l.id !== id);
      this.flash = `Cancelled ${displayName(listing.item)}`;
      this.setPage(this.page);
      return;
    }

    try {
      await api.cancel(id);
      runInAction(() => {
        this.flash = `Cancelling ${displayName(listing.item)}. A trader will return it.`;
      });
    } catch (error) {
      runInAction(() => {
        this.flash = error instanceof Error ? error.message : 'That could not be cancelled.';
      });
    }
    await this.refresh();
  }

  pickForSale(index: number | null): void {
    this.sellPick = index;
    this.sellPrice = '';
  }

  setSellPrice(value: string): void {
    // Digits only, and never above the game's own Zen ceiling.
    const digits = value.replace(/\D/g, '').slice(0, 10);
    const n = Number(digits || 0);
    this.sellPrice = n > 2_000_000_000 ? '2000000000' : digits;
  }

  get sellPriceValue(): number {
    return Number(this.sellPrice || 0);
  }

  /**
   * What the same item is going for right now, cheapest first. Matched on the
   * base item rather than the exact roll: a seller wants to see every Dragon
   * Armor on the market, then judge their own +9 excellent against them.
   */
  get comparable(): Listing[] {
    const item = this.sellPick === null ? null : this.inventory[this.sellPick];
    if (!item) return [];
    return this.listings
      .filter(l => l.item.group === item.group && l.item.num === item.num)
      .sort((a, b) => a.price - b.price);
  }

  /** The cheapest of those, which is the number a seller actually undercuts. */
  get comparableFloor(): number | null {
    return this.comparable[0]?.price ?? null;
  }

  /**
   * Asks the service to list the item. It is not on sale yet: a bot has to
   * come and take it first, and only then does anyone else see it. Saying
   * "listed" here would be a lie, so the wording says what actually happens.
   */
  async listForSale(): Promise<void> {
    const index = this.sellPick;
    const item = index === null ? null : this.inventory[index];
    if (!item || this.sellPriceValue <= 0) return;

    if (this.mode === 'offline') {
      this.listings = [
        {
          id: `L${Math.random().toString(36).slice(2, 7)}`,
          item,
          category: categoryOf(item),
          seller: 'You',
          price: this.sellPriceValue,
          listedAt: Date.now(),
          median: this.sellPriceValue,
          mine: true,
        },
        ...this.listings,
      ];
      this.inventory = this.inventory.filter((_, i) => i !== index);
      this.sellPick = null;
      this.sellPrice = '';
      this.flash = `Listed ${displayName(item)}`;
      this.setTab('mine');
      return;
    }

    const price = this.sellPriceValue;
    try {
      await api.list(item, price, categoryOf(item));
      runInAction(() => {
        this.sellPick = null;
        this.sellPrice = '';
        this.flash = `A trader is coming for your ${displayName(item)}.`;
      });
      this.setTab('mine');
    } catch (error) {
      runInAction(() => {
        this.flash = error instanceof Error ? error.message : 'That listing was refused.';
      });
    }
    await this.refresh();
  }

  /** Asks for the Zen the service is holding from sales made while away. */
  async collectPayout(): Promise<void> {
    if (this.payoutOwed <= 0) return;
    try {
      const { owed } = await api.requestPayout();
      runInAction(() => {
        this.flash = `A trader is bringing you ${formatZen(owed)} Zen.`;
      });
    } catch (error) {
      runInAction(() => {
        this.flash = error instanceof Error ? error.message : 'That could not be collected.';
      });
    }
  }

  clearFlash(): void {
    this.flash = null;
  }

  /** The world page pushes the live numbers in; the harness pushes fixtures. */
  syncFromGame(zen: number, inventory: Listing['item'][]): void {
    this.zen = zen;
    this.inventory = inventory;
  }
}

export const Marketplace = new MarketplaceStore();

export const toggleMarketplaceWindow = () => Marketplace.toggle();

export function formatZen(zen: number): string {
  return zen.toLocaleString('en-US');
}

/** "2h ago" / "3d ago", short enough for a card corner. */
export function sinceLabel(at: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
