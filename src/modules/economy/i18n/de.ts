/** German text of the `economy` module. */

import type en from './en';

export default {
  'trade.offerChanged': 'Die Gegenseite hat das Angebot geändert',
  'trade.alreadyTrading': 'Du handelst bereits.',
  'trade.closeWindows': 'Schließe die anderen Fenster vor dem Handel.',
  'trade.requestSent': 'Handelsanfrage an {name} gesendet.',
  'trade.completed': 'Der Handel ist abgeschlossen.',
  'trade.cancelled': 'Der Handel wurde abgebrochen.',
  'trade.noRoom': 'Handel fehlgeschlagen: nicht genug Platz.',
  'trade.timedOut': 'Der Handel ist abgelaufen.',
  'trade.itemNotTradable':
    'Handel fehlgeschlagen: ein Gegenstand ist nicht handelbar.',
  'personalShop.needName': 'Gib deinem Laden zuerst einen Namen.',
  'personalShop.needItems': 'Stelle zuerst etwas zum Verkauf.',
  'personalShop.needPrices': 'Jeder Gegenstand im Laden braucht einen Preis.',
  'personalShop.opened': 'Dein Laden ist offen.',
  'personalShop.itemSold':
    '{buyer} hat einen Gegenstand aus deinem Laden gekauft.',
  'personalShop.sellerUnavailable': 'Der Verkäufer ist nicht erreichbar.',
  'personalShop.shopClosed': 'Dieser Laden ist geschlossen.',
  'personalShop.sellerBusy':
    'Der Verkäufer ist mit jemand anderem beschäftigt.',
  'personalShop.itemNoPrice': 'Dieser Gegenstand hat keinen Preis.',
  'personalShop.noRoomForItem': 'Für diesen Gegenstand ist kein Platz.',
  'personalShop.tradingBlocked': 'Der Verkäufer hat den Handel gesperrt.',
  'personalShop.purchaseFailed': 'Der Kauf ist fehlgeschlagen.',
  'personalShop.notEnoughZen': 'Du hast nicht genug Zen.',
  'chaos.succeeded': 'Die Kombination ist geglückt.',
  'chaos.failed': 'Die Kombination ist fehlgeschlagen.',
  'chaos.cardSucceeded': 'Die Chaoskarten-Kombination ist geglückt.',
  'chaos.cardFailed': 'Die Chaoskarten-Kombination ist fehlgeschlagen.',
  'chaos.takeItemsOut':
    'Nimm deine Gegenstände zuerst aus der Chaos Machine.',
  'chaos.putItemsIn':
    'Lege die zu kombinierenden Gegenstände in die Chaos Machine.',
  'chaos.notEnoughZen': 'Nicht genug Zen für die Kombination.',
  'chaos.devilSquareLevel': 'Für die Einladung zum Devil Square musst du über Level 10 sein.',
  'chaos.cloakLevel': 'Für einen Umhang der Unsichtbarkeit musst du über Level 15 sein.',
  'notify.wrongVaultPin': 'Falsche Lager-PIN',
  'notify.unlockBeforePin': 'Entsperre das Lager, bevor du die PIN änderst',
  'notify.wrongPassword': 'Falsches Kontopasswort',
  'notify.unlockVaultFirst': 'Entsperre zuerst das Lager',
  'notify.zenNotMoved': 'Das Zen konnte nicht bewegt werden',
  'notify.chaosNeedsServer': 'Die Chaos Machine braucht einen Server',
  'notify.notThatMuchZen': 'So viel Zen hast du nicht',
  'chaos.add380': '380er-Option hinzufügen',
  'chaos.lackItems': 'Für die Kombination fehlen Gegenstände.',
  'chaos.levelRequired': '{name} ist ab Stufe {level} möglich.',
  'chaos.makeRoom': 'Räume vor dem Kombinieren dein Inventar auf.',
  'chaos.sameSphere': 'Eine Sphäre derselben Art kann nicht eingesetzt werden.',
  'chaos.selectSocket': 'Du musst einen Sockel wählen.',
  'chaos.socketApplied': 'Dort ist bereits etwas eingesetzt.',
  'chaos.selectDestructible': 'Du musst einen Sockel zum Zerstören wählen.',
  'chaos.noDestructible': 'Es gibt keine Samensphäre zum Zerstören.',
} satisfies Partial<Record<keyof typeof en, string>>;
