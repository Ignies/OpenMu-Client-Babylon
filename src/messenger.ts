import { action, makeObservable, observable, runInAction } from 'mobx';
import { Store } from './store';
import { Social } from './social';
import {
  MAX_FRIENDS,
  MAX_LETTER_TEXT,
  MAX_LETTER_TITLE,
  sortFriends,
  sortLetters,
  type Friend,
  type Letter,
} from './common/messenger';
import {
  FriendAddRequestPacket,
  FriendAddResponsePacket,
  FriendDeletePacket,
  FriendListRequestPacket,
  LetterDeleteRequestPacket,
  LetterListRequestPacket,
  LetterReadRequestPacket,
  LetterSendRequestPacket,
  SetFriendOnlineStatePacket,
} from './common/packets/ClientToServerPackets';
import { playUiSound } from './libs/sfx';

export type MessengerTab = 'friends' | 'letters';

/** The window the letter box opens on top of itself: read or write. */
export type LetterView =
  | { kind: 'read'; index: number }
  | { kind: 'write'; to: string; subject: string; body: string };

/**
 * `CNewUIFriendWindow` and the two lists behind it (`CFriendList`,
 * `CLetterList`), with the packet plumbing of `ReceiveFriend*` /
 * `ReceiveLetter*` (WSclient.cpp).
 */
export const Messenger = new (class _Messenger {
  windowEnabled = false;
  tab: MessengerTab = 'friends';

  friends: Friend[] = [];
  /** The row the friend list has selected, by name. */
  selectedFriend = '';

  letters: Letter[] = [];
  /** `MaximumLetterCount` from MessengerInitialization. */
  maxLetters = 0;
  selectedLetter = -1;
  /** The read / write sheet over the letter box, closed when null. */
  letterView: LetterView | null = null;
  /** A send is in flight: the Send button waits for LetterSendResponse. */
  sending = false;

  /** `FriendRequest`: another player asks to be added, yes/no. */
  friendRequest: { name: string } | null = null;

  /** `m_bChatReject` / SetFriendOnlineState: appear offline to the list. */
  appearOffline = false;

  constructor() {
    makeObservable(this, {
      windowEnabled: observable,
      tab: observable,
      friends: observable.shallow,
      selectedFriend: observable,
      letters: observable.shallow,
      maxLetters: observable,
      selectedLetter: observable,
      letterView: observable,
      sending: observable,
      friendRequest: observable,
      appearOffline: observable,
      setFriends: action,
      addFriend: action,
      removeFriend: action,
      setFriendState: action,
      addLetter: action,
      removeLetter: action,
      setLetterBody: action,
      reset: action,
    });
  }

  /** Everything here belongs to the character: cleared on select / relog. */
  reset(): void {
    this.windowEnabled = false;
    this.tab = 'friends';
    this.friends = [];
    this.selectedFriend = '';
    this.letters = [];
    this.maxLetters = 0;
    this.selectedLetter = -1;
    this.letterView = null;
    this.sending = false;
    this.friendRequest = null;
    this.appearOffline = false;
  }

  get unreadLetters(): number {
    return this.letters.filter(l => !l.read).length;
  }

  // ---- window -------------------------------------------------------------

  toggleWindow(): void {
    runInAction(() => {
      this.windowEnabled = !this.windowEnabled;
      if (!this.windowEnabled) this.letterView = null;
    });
    // `OpenMainWnd` asks the server for both lists.
    if (this.windowEnabled) {
      this.requestFriendList();
      this.requestLetterList();
    }
  }

  closeWindow(): void {
    runInAction(() => {
      this.windowEnabled = false;
      this.letterView = null;
    });
  }

  setTab(tab: MessengerTab): void {
    runInAction(() => {
      this.tab = tab;
      this.letterView = null;
    });
  }

  selectFriend(name: string): void {
    runInAction(() => {
      this.selectedFriend = name;
    });
  }

  selectLetter(index: number): void {
    runInAction(() => {
      this.selectedLetter = index;
    });
  }

  // ---- friends ------------------------------------------------------------

  requestFriendList(): void {
    Store.sendToGS(FriendListRequestPacket.createPacket().buffer);
  }

  setFriends(friends: Friend[]): void {
    this.friends = sortFriends(friends);
  }

  addFriend(name: string, server: number): void {
    const others = this.friends.filter(f => f.name !== name);
    others.push({ name, server });
    this.friends = sortFriends(others);
  }

  removeFriend(name: string): void {
    this.friends = this.friends.filter(f => f.name !== name);
    if (this.selectedFriend === name) this.selectedFriend = '';
  }

  /** `UpdateFriendState`: a friend logged in or out. */
  setFriendState(name: string, server: number): void {
    const friend = this.friends.find(f => f.name === name);
    if (!friend) return;
    friend.server = server;
    this.friends = sortFriends(this.friends);
  }

  /** `SendFriendAddRequest`: the Add button of the friend tab. */
  requestAddFriend(name: string): boolean {
    const target = name.trim();
    if (!target) return false;
    if (target === Store.playerData.name) {
      Social.errorMessage('You cannot add yourself as a friend.');
      return false;
    }
    if (this.friends.some(f => f.name === target)) {
      Social.errorMessage(`${target} is already on your friend list.`);
      return false;
    }
    if (this.friends.length >= MAX_FRIENDS) {
      Social.errorMessage('Your friend list is full.');
      return false;
    }
    const packet = FriendAddRequestPacket.createPacket();
    packet.setFriendName(target);
    Store.sendToGS(packet.buffer);
    Social.systemMessage(`Friend request sent to ${target}.`);
    return true;
  }

  /** The yes/no answer to an incoming friend request. */
  respondToFriendRequest(accepted: boolean): void {
    const request = this.friendRequest;
    if (!request) return;
    const packet = FriendAddResponsePacket.createPacket();
    packet.Accepted = accepted;
    packet.setFriendRequesterName(request.name);
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.friendRequest = null;
    });
  }

  deleteFriend(name: string): void {
    const packet = FriendDeletePacket.createPacket();
    packet.setFriendName(name);
    Store.sendToGS(packet.buffer);
  }

  /** `SetChatReject`: hide from the friend list without logging out. */
  setAppearOffline(offline: boolean): void {
    const packet = SetFriendOnlineStatePacket.createPacket();
    packet.OnlineState = !offline;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.appearOffline = offline;
    });
  }

  /** The Talk button: put the friend in the chat box's whisper field. */
  whisperFriend(name: string): void {
    Social.setWhisperTarget(name);
    Social.openChatInput();
  }

  // ---- letters ------------------------------------------------------------

  requestLetterList(): void {
    Store.sendToGS(LetterListRequestPacket.createPacket().buffer);
  }

  addLetter(letter: Letter): void {
    const others = this.letters.filter(l => l.index !== letter.index);
    others.push(letter);
    this.letters = sortLetters(others);
  }

  removeLetter(index: number): void {
    this.letters = this.letters.filter(l => l.index !== index);
    if (this.selectedLetter === index) this.selectedLetter = -1;
    if (this.letterView?.kind === 'read' && this.letterView.index === index) {
      this.letterView = null;
    }
  }

  setLetterBody(index: number, body: string): void {
    const letter = this.letters.find(l => l.index === index);
    if (!letter) return;
    letter.body = body;
    letter.read = true;
    letter.isNew = false;
    this.letters = this.letters.slice();
  }

  /** `LetterReadCheck` + `SendLetterReadRequest`: open one letter. */
  openLetter(index: number): void {
    runInAction(() => {
      this.selectedLetter = index;
      this.letterView = { kind: 'read', index };
    });
    const letter = this.letters.find(l => l.index === index);
    if (letter?.body !== undefined) return; // already cached
    const packet = LetterReadRequestPacket.createPacket();
    packet.LetterIndex = index;
    Store.sendToGS(packet.buffer);
  }

  deleteLetter(index: number): void {
    const packet = LetterDeleteRequestPacket.createPacket();
    packet.LetterIndex = index;
    Store.sendToGS(packet.buffer);
  }

  /** The Write button, and Reply with the sender pre-filled. */
  composeLetter(to = '', subject = ''): void {
    runInAction(() => {
      this.letterView = { kind: 'write', to, subject, body: '' };
    });
  }

  updateDraft(patch: Partial<{ to: string; subject: string; body: string }>): void {
    runInAction(() => {
      if (this.letterView?.kind !== 'write') return;
      this.letterView = { ...this.letterView, ...patch };
    });
  }

  closeLetterView(): void {
    runInAction(() => {
      this.letterView = null;
    });
  }

  /**
   * `SendLetterSendRequest`. `LetterId` is the client's own request id, which
   * LetterSendResponse echoes back; the original counts up from 1 and so do
   * we. Rotation and animation are the sender's portrait pose, which the
   * original picks with the two arrows next to the photo - the hero's default
   * pose is sent instead.
   */
  sendLetter(): boolean {
    const view = this.letterView;
    if (!view || view.kind !== 'write' || this.sending) return false;

    const to = view.to.trim();
    const subject = view.subject.trim().slice(0, MAX_LETTER_TITLE);
    const body = view.body.slice(0, MAX_LETTER_TEXT);

    if (!to || !subject) {
      playUiSound('error');
      return false;
    }
    if (to === Store.playerData.name) {
      Social.errorMessage('You cannot send a letter to yourself.');
      return false;
    }

    // getRequiredSize counts from the code byte: 4 (letter id) + 10 (receiver)
    // + 60 (title) + 1 rotation + 1 animation + 2 message length.
    const packet = LetterSendRequestPacket.createPacket(
      LetterSendRequestPacket.getRequiredSize(78 + body.length)
    );
    packet.LetterId = this.nextLetterId++;
    packet.setReceiver(to);
    packet.setTitle(subject);
    packet.Rotation = 0;
    packet.Animation = 0;
    packet.MessageLength = body.length;
    packet.setMessage(body);
    Store.sendToGS(packet.buffer);

    runInAction(() => {
      this.sending = true;
    });
    return true;
  }

  /** LetterSendResponse: unblock the Send button and close the sheet on success. */
  sendFinished(success: boolean): void {
    runInAction(() => {
      this.sending = false;
      if (success) this.letterView = null;
    });
  }

  private nextLetterId = 1;
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
