import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { EventBus } from '@/core/eventBus';
import type { Events } from '@/core/eventBus/events';
import { uiClick } from '@/controllers/sound';
import {
  CharacterFocusedPacket,
  CharacterListPacket,
} from '@versions/shared/packets/ServerToClientPackets';
import { CharacterSelectionPlate } from '../CharacterSelectionPlate';
import { rosterRows, type ListedCharacter, type RowBox } from './roster';

export {
  hasFreeSlot,
  listStatus,
  selectedCharacter,
  type ListedCharacter,
} from './roster';

/** Where the list lives and how it is asked for. The Store satisfies it. */
interface CharacterListSource {
  charactersList: ListedCharacter[];
  loadingCharactersList: boolean;
  focusedChar: string;
  creationUnlockFlags: CharacterListPacket['UnlockFlags'];
  refreshCharactersListRequest(): void;
  focusCharacterRequest(name: string): void;
}

type CharacterListProps = {
  source: CharacterListSource;
  /** Called when a new list arrives, before it is stored. */
  onList?: () => void;
} & (
  | {
      /** The 3D line-up (`characterSelectSystem` draws the actors): the name plate. */
      look: 'lineup';
    }
  | {
      /** A clickable name and level per character, stacked from `row`. */
      look: 'rows';
      row: RowBox;
    }
);

/**
 * The account's character list: asks for it on mount, stores the server's
 * `CharacterList` and `CharacterFocused` answers, and draws the roster.
 */
export const CharacterList = observer((props: CharacterListProps) => {
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    latest.current.source.refreshCharactersListRequest();
  }, []);

  useEffect(() => {
    const onList = (bytes: Events['CharacterList']) => {
      const { source, onList } = latest.current;
      const p = new CharacterListPacket(bytes);
      const characters = p.getCharacters();
      onList?.();
      runInAction(() => {
        source.loadingCharactersList = false;
        source.charactersList = characters;
        source.creationUnlockFlags = p.UnlockFlags;
      });
    };
    const onFocused = (bytes: Events['CharacterFocused']) => {
      latest.current.source.focusedChar = new CharacterFocusedPacket(bytes).CharacterName;
    };

    EventBus.on('CharacterList', onList);
    EventBus.on('CharacterFocused', onFocused);
    return () => {
      EventBus.off('CharacterList', onList);
      EventBus.off('CharacterFocused', onFocused);
    };
  }, []);

  if (props.look === 'lineup') return <CharacterSelectionPlate />;

  const { source } = props;

  return (
    <>
      {rosterRows(source.charactersList, props.row).map(({ character, ...box }) => (
        <button
          key={character.Name}
          type="button"
          className={
            character.Name === source.focusedChar ? 'char-list-row is-selected' : 'char-list-row'
          }
          style={box}
          onClick={uiClick(() => {
            source.focusedChar = character.Name;
            source.focusCharacterRequest(character.Name);
          })}
        >
          <span>{character.Name}</span>
          <span className="char-list-level">{`Lv ${character.Level}`}</span>
        </button>
      ))}
    </>
  );
});
