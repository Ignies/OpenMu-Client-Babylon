/** English text of the `friends` window. See src/i18n/readme.md. */

const en = {
  'friends.title': 'Friend list',
  'friends.tab.friends': 'Friends',
  'friends.tab.letters': 'Letters',
  'friends.empty': 'Your friend list is empty.',
  'friends.lettersEmpty': 'Your letter box is empty.',
  'friends.namePlaceholder': 'Character name',
  'friends.server': 'Server {server}',
  'friends.letter': 'Letter',
  'friends.openingLetter': 'Opening the letter...',
  'friends.writeLetter': 'Write a letter',
  'friends.count': 'Friends ({count}/{max})',
  'friends.lettersCount': 'Letters ({count}/{max})',
  'friends.unread': ' {count} new',
  'friends.add': 'Add',
  'friends.talk': 'Talk',
  'friends.letterButton': 'Letter',
  'friends.delete': 'Delete',
  'friends.hide': 'Hide',
  'friends.write': 'Write',
  'friends.read': 'Read',
  'friends.reply': 'Reply',
  'friends.from': 'From {sender} · {time}',
  'friends.to': 'To',
  'friends.subject': 'Subject',
  'friends.replyPrefix': 'Re: {subject}',

  'friends.tab.rooms': 'Chat',
  'friends.roomsEmpty': 'No open chat rooms.',
  'friends.roomsCount': 'Chat rooms ({count})',
  'friends.roomAlert': 'New',
  'friends.open': 'Open',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/friends': typeof en;
  }
}
