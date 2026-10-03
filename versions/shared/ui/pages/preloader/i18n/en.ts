/** English text of the `preloader` page. See src/i18n/readme.md. */

const en = {
  'preloader.playOffline': 'Play Offline',

  'server.list': 'Servers',
  'server.name': 'Name',
  'server.connectServer': 'Connect server',
  'server.port': 'Port',
  'server.proxy': 'WS proxy',
  'server.unnamed': 'Unnamed',
  'server.newServer': 'New server',
  'server.add': 'Add',
  'server.delete': 'Delete',
  'server.trustAddress': 'Use the game server address the server sends',
  'server.proxyHint':
    'The proxy reaches the server, so the host is as the proxy sees it.',
  'server.insecure':
    'This page is https: a ws:// proxy is blocked, use wss://.',
  'server.lockedByUrl': 'Pinned by the URL (?cs= / ?ws=).',
  'server.listedHint': 'From the published list - pick another world, or Copy it to edit.',
  'server.listOffline': 'The published server list could not be read.',
  'server.copy': 'Copy',

  'worlds.enter': 'Enter',
  'worlds.empty': 'No world to show here.',
  'worlds.needsClient': 'This world needs {world}; this client has {client}.',
  'worlds.yours': 'YOURS',
  'worlds.lastPlayed': 'Last played',
  'worlds.filterAll': 'All',
  'worlds.refresh': 'Refresh',
  'worlds.checking': 'Checking...',
  'worlds.answering': 'Answering',
  'worlds.noAnswer': 'No answer',
  'worlds.tabWorlds': 'Worlds',
  'worlds.tabSetup': 'Setup',
  'worlds.tabInfo': 'Details',
  'worlds.tabAccount': 'Accounts',
  'worlds.search': 'Search worlds',
  'worlds.clearSearch': 'Clear the search',
  'worlds.noMatch': 'Nothing matches "{text}".',
  'worlds.count': '{shown} of {total}',
  'worlds.scenePreparing': 'Getting the game ready',
  'worlds.sceneReady': 'Ready to enter',
  'worlds.start': 'Start',
  'worlds.headline': 'Choose your world',
  'worlds.lead': 'Pick a world, then step in.',
  'worlds.tabWorldsDesc': 'Published worlds and your own, with their details and your accounts.',
  'worlds.tabSetupDesc': 'The addresses this client connects to, for a server of your own.',
  'worlds.tabDownloadDesc': 'Fetch the game ahead of time and pick a texture pack.',
  'credits.contributor': 'Contributor',
  'credits.commits': '{count} commits',
  'credits.reporter': 'Bug reports',
  'credits.reports': '{count} reports',
  'credits.thanks': 'Special thanks',
  'credits.playtesting': 'Playtesting',
  'credits.everyone': 'Everyone who contributed',
  'worlds.hidePanel': 'Hide panel',
  'worlds.showPanel': 'Show panel',
  'worlds.showPassword': 'Show password',
  'worlds.hidePassword': 'Hide password',
  'worlds.hasAccount': 'An account is saved for this world',
  /** One glyph on the card, so it must stay short in every language. */
  'worlds.accountMark': 'ID',

  // The details tab: what the published list knows about a world, before the
  // client has said a word to it.
  'info.client': 'Client',
  'info.anyClient': 'Any',
  'info.address': 'Address',
  'info.route': 'Route',
  'info.status': 'Status',
  'info.notChecked': 'Not checked yet',
  'info.account': 'Account',
  'info.noAccount': 'None saved',
  'info.lastLogin': 'Last login',
  'info.never': 'Never',
  'info.noDescription': 'This world published no description.',
  'info.gameServers': 'Game servers',
  'info.noGameServers':
    'This world published no server names; they arrive once connected.',

  // The accounts tab: the logins saved for one world, a main and its mules.
  'account.list': 'Accounts on {world}',
  'account.unnamed': 'New account',
  'account.addFirst': 'Add an account first',
  'account.keepPassword': 'Remember the password',
  'account.entersAs': 'Enter signs in as {name}.',
  /** The row tag for an account whose password is not kept. */
  'account.notKept': 'ASK',
  'account.storedLocally': 'Kept in this browser only, in plain text.',
  'account.cannotSave': 'This world cannot keep an account.',
  'account.needSignup': 'No account yet? Create one on the login screen.',
  'worlds.tabDownload': 'Download',
  'download.group.core': 'Base game',
  'download.group.monsters': 'Monsters',
  'download.group.audio': 'Music and sounds',
  'download.group.icons': 'Item icons',
  'download.total': 'Total',
  'download.withPack': 'pack',
  'download.start': 'Download',
  'download.again': 'Download again',
  'download.cancel': 'Stop',
  'download.clear': 'Clear cache',
  'download.stored': 'stored',
  'download.unavailable': 'This server does not offer downloads.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/pages/preloader': typeof en;
  }
}
