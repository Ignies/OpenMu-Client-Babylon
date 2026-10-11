/** English text of the `marketplace` window. See src/i18n/readme.md. */

const en = {
  'marketplace.title': 'Marketplace',
  'marketplace.tab.browse': 'Browse',
  'marketplace.tab.mine': 'My listings',
  'marketplace.tab.sell': 'Sell',
  'marketplace.search': 'Search items or sellers',
  'marketplace.listView': 'List view',
  'marketplace.gridView': 'Grid view',
  'marketplace.excellentOnly': 'Excellent only',
  'marketplace.affordable': 'I can afford',
  'marketplace.listings': '{count} listings',
  'marketplace.page': 'page {page} / {total}',
  'marketplace.prev': 'Prev',
  'marketplace.next': 'Next',
  'marketplace.empty': 'Nothing is listed yet. Put something up on the Sell tab.',
  'marketplace.noMatch': 'Nothing matches that.',
  'marketplace.buy': 'Buy',
  'marketplace.short': 'Short',
  'marketplace.confirm': 'Confirm',
  'marketplace.buyThis': 'Buy this?',
  'marketplace.fromSeller': 'from {seller}',
  'marketplace.colItem': 'Item',
  'marketplace.colSeller': 'Seller',
  'marketplace.colListed': 'Listed',
  'marketplace.price': 'Price',
  'marketplace.onTheMarket': 'On the market',
  'marketplace.listedCount': '{count} listed',
  'marketplace.nothingLikeIt': 'Nothing like it is listed. You set the price.',
  'marketplace.cheapest': 'cheapest',
  'marketplace.undercut': 'Undercut the cheapest',
  'marketplace.yourBag': 'Your bag',
  'marketplace.yourItem': 'Your item',
  'marketplace.bagEmpty': 'Nothing here to sell.',
  'marketplace.bagNoneOfKind': 'Nothing of that kind in your bag.',
  'marketplace.listIt': 'List it',
  'marketplace.sellNote': 'The item leaves your bag when you list it and comes back if you cancel.',
  /** Items up to negotiate (ours): no price, a whisper to the seller, a trade in game. */
  'marketplace.toNegotiate': 'To negotiate',
  'marketplace.negotiate': 'Whisper',
  'marketplace.negotiateHint': 'Opens a whisper to the seller with the item linked; you close the deal with a trade.',
  'marketplace.modeZen': 'For Zen',
  'marketplace.modeNegotiate': 'To negotiate',
  'marketplace.notePlaceholder': 'What you want for it (optional)',
  'marketplace.publishNegotiate': 'Put it up',
  'marketplace.negotiateNote': 'The item stays in your bag. Buyers whisper you and you trade in game.',
  'marketplace.pickToPrice': 'Pick something from your bag to price it.',
  'marketplace.owed': 'You are owed {amount} Zen',
  'marketplace.collect': 'Collect',
  'marketplace.tab.history': 'History',
  'marketplace.kind.sale': 'Sale',
  'marketplace.kind.purchase': 'Purchase',
  'marketplace.kind.payout': 'Payout',
  'marketplace.status.success': 'Success',
  'marketplace.status.failed': 'Failed',
  'marketplace.status.pending': 'Pending',
  'marketplace.colStatus': 'Status',
  'marketplace.colWhen': 'When',
  'marketplace.historyEmpty': 'Nothing has happened yet.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/marketplace': typeof en;
  }
}
