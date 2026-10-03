/** English text of the `friends` module. See src/i18n/readme.md. */

const en = {
  'friends.cannotAddSelf': 'You cannot add yourself as a friend.',
  'friends.alreadyOnList': '{name} is already on your friend list.',
  'friends.listFull': 'Your friend list is full.',
  'friends.requestSent': 'Friend request sent to {name}.',
  'friends.requestFailed': 'The friend request could not be sent.',
  'friends.added': '{name} was added to your friend list.',
  'friends.cannotLetterSelf': 'You cannot send a letter to yourself.',
  'friends.letterArrived': 'A letter arrived from {name}.',
  'friends.letterDeleteFailed': 'The letter could not be deleted.',
  'friends.letterSent': 'The letter was sent.',
  'friends.letterTryAgain': 'The letter could not be sent. Try again.',
  'friends.mailboxFull': 'That mailbox is full.',
  'friends.noSuchCharacter': 'There is no character with that name.',
  'friends.letterNeedsZen': 'You do not have enough Zen to send a letter.',
  'friends.letterFailed': 'The letter could not be sent.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/friends': typeof en;
  }
}
