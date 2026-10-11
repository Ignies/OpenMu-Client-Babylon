/** English text of the `party` window. See src/i18n/readme.md. */

const en = {
  'party.title': 'Party',
  'party.leader': 'Party leader',
  'party.leave': 'Leave the party',
  'party.kick': 'Kick {name}',
  'party.nearby': 'Nearby players',
  'party.nearbyEmpty': 'Stand next to a player to invite.',
  'party.tradeWith': 'Trade with {name}',
  'party.notInParty': 'Not in a party.',
  'party.invite': 'Invite',
  'party.shop': 'Shop',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/party': typeof en;
  }
}
