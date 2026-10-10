/** English text of the `economy` module. See src/i18n/readme.md. */

const en = {
  'trade.offerChanged': 'The other side changed the offer',
  'trade.alreadyTrading': 'You are already trading.',
  'trade.closeWindows': 'Close the other windows before trading.',
  'trade.requestSent': 'Trade request sent to {name}.',
  'trade.completed': 'The trade was completed.',
  'trade.cancelled': 'The trade was cancelled.',
  'trade.noRoom': 'The trade failed: not enough room.',
  'trade.timedOut': 'The trade timed out.',
  'trade.itemNotTradable': 'The trade failed: an item may not be traded.',
  'personalShop.needName': 'Give your shop a name first.',
  'personalShop.needItems': 'Put something up for sale first.',
  'personalShop.needPrices': 'Every item in the shop needs a price.',
  'personalShop.opened': 'Your shop is open.',
  'personalShop.itemSold': '{buyer} bought an item from your shop.',
  'personalShop.sellerUnavailable': 'The seller is not available.',
  'personalShop.shopClosed': 'That shop is closed.',
  'personalShop.sellerBusy': 'The seller is busy with someone else.',
  'personalShop.itemNoPrice': 'That item has no price.',
  'personalShop.noRoomForItem': 'There is no room for that item.',
  'personalShop.tradingBlocked': 'The seller has item trading blocked.',
  'personalShop.purchaseFailed': 'The purchase failed.',
  'personalShop.notEnoughZen': 'You do not have enough Zen.',
  'chaos.succeeded': 'The combination succeeded.',
  'chaos.failed': 'The combination failed.',
  'chaos.takeItemsOut': 'Take your items out of the chaos machine first.',
  'chaos.putItemsIn': 'Put the items to combine into the chaos machine.',
  'chaos.notEnoughZen': 'Not enough Zen for the combination.',
  'chaos.tooManyItems': 'Too many items in the chaos machine.',
  'chaos.levelTooLow': 'Your level is too low for this combination.',
  'chaos.lackingItems': 'Some items for this combination are missing.',
  'chaos.incorrectItems': 'These items cannot be combined that way.',
  'chaos.invalidItemLevel': 'The item level is wrong for this combination.',
  'chaos.classTooLow': 'Your class cannot make this combination.',
  'chaos.bloodCastleItems': 'The Blood Castle items are not correct.',
  'chaos.bloodCastleZen': 'Not enough Zen for the invitation.',
  'notify.wrongVaultPin': 'Wrong vault pin',
  'notify.unlockBeforePin': 'Unlock the vault before changing its pin',
  'notify.wrongPassword': 'Wrong account password',
  'notify.unlockVaultFirst': 'Unlock the vault first',
  'notify.zenNotMoved': 'The Zen could not be moved',
  'notify.chaosNeedsServer': 'The chaos machine needs a server',
  'notify.notThatMuchZen': 'You do not have that much Zen',
  'chaos.add380': 'Add 380 item option',
  'chaos.lackItems': 'Some items for the combination are missing.',
  'chaos.levelRequired': '{name} is available from level {level}.',
  'chaos.makeRoom': 'Combine items after organizing your inventory.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/economy': typeof en;
  }
}
