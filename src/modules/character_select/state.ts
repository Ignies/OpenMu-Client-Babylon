import { makeObservable, observable, runInAction } from 'mobx';
import { CharacterClassNumber } from '@/core/types';
import { playUiSound } from '@/controllers/sound';
import { classFromAppearance } from '@/controllers/actors';
import {
  CreateCharacterPacket,
  DeleteCharacterPacket,
  FocusCharacterPacket,
  RequestCharacterListPacket,
  SelectCharacterPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import {
  CharacterCreationUnlockFlagsEnum,
  GuildMemberRoleEnum,
  type CharacterListPacket,
} from '@versions/shared/packets/ServerToClientPackets';
import { Hero } from '../hero';
import { Session } from '../session';

/**
 * The account's characters (`CharacterList`), the one in focus, the create form and the delete
 * in flight, with the requests the character page sends.
 */
export const CharSelect = new (class {
  charactersList: ReturnType<CharacterListPacket['getCharacters']> = [];

  loadingCharactersList = false;

  newCharName: string = '';

  newCharClass: CharacterClassNumber = CharacterClassNumber.DarkKnight;

  focusedChar: string = '';

  creationUnlockFlags: CharacterCreationUnlockFlagsEnum =
    CharacterCreationUnlockFlagsEnum.None;

  charCreationPending = false;

  deletingChar: string | null = null;

  refreshCharactersListRequest(): void {
    runInAction(() => {
      this.loadingCharactersList = true;
    });
    const packet = RequestCharacterListPacket.createPacket();
    packet.Language = 0;
    Session.sendToGS(packet.buffer);
  }

  focusCharacterRequest(name: string): void {
    const packet = FocusCharacterPacket.createPacket();
    packet.setName(name);
    Session.sendToGS(packet.buffer);
  }

  selectCharacterRequest(name: string): void {
    const selectCharacterPacket = SelectCharacterPacket.createPacket();
    selectCharacterPacket.setName(name);

    const character = this.charactersList.find(c => c.Name === name);

    runInAction(() => {
      Hero.name = name;
      if (character) {
        Hero.charClass = classFromAppearance(character.Appearance);
        // CharacterInformation carries no level - the list entry is the only source
        // until the first CharacterLevelUpdate.
        Hero.level = character.Level;
      }
    });

    console.log(`select character [${name}]`);
    Session.sendToGS(selectCharacterPacket.buffer);
  }

  deleteCharacterRequest(name: string, securityCode: string): void {
    this.deletingChar = name;

    const packet = DeleteCharacterPacket.createPacket();
    packet.setName(name);
    packet.setSecurityCode(securityCode);

    console.log(`delete character [${name}]`);
    Session.sendToGS(packet.buffer);
    // DeleteCharacter (LoginScene.cpp:124): SOUND_MENU01.
    playUiSound('menuMove');
  }

  createCharacterRequest(name: string, charClass: CharacterClassNumber): void {
    const packet = CreateCharacterPacket.createPacket();
    packet.setName(name);
    packet.Class = charClass;

    runInAction(() => {
      this.charCreationPending = true;
    });

    console.log(`create character [${name}] class ${charClass}`);
    Session.sendToGS(packet.buffer);
  }

  addCreatedCharacter(character: {
    SlotIndex: number;
    Name: string;
    Level: number;
    Status: number;
    Appearance: DataView;
  }): void {
    runInAction(() => {
      const list = this.charactersList.filter(
        c => c.SlotIndex !== character.SlotIndex
      );

      list.push({
        ...character,
        IsItemBlockActive: false,
        GuildPosition: GuildMemberRoleEnum.Undefined,
      } as (typeof this.charactersList)[number]);

      list.sort((a, b) => a.SlotIndex - b.SlotIndex);

      this.charactersList = list;
      this.focusedChar = character.Name;
      this.charCreationPending = false;
      this.newCharName = '';
    });
  }

  constructor() {
    makeObservable(this, {
      charactersList: observable,
      loadingCharactersList: observable,
      newCharName: observable,
      newCharClass: observable,
      creationUnlockFlags: observable,
      charCreationPending: observable,
      focusedChar: observable,
    });
  }
})();
