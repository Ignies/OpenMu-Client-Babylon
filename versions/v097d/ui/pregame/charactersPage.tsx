/**
 * The 0.97d character screen: the `Logo/0New_Account01.OZT` plate with the
 * `0New_Account02.OZT` foot under it, drawn over the ship scene.
 *
 * Deferred, and stated in the PR: the 3D actors on the deck, and character
 * creation. The actors need `world.terrain`, which a set-piece backdrop does
 * not have (`RenderSystem` and `ModelLoaderSystem` both bail on it), so the
 * roster is the shared `CharacterList` drawn as rows rather than five figures
 * to click; creation is the `Card01..04` / `Face01..04` carousel, a screen of
 * its own.
 */
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { t } from '@/i18n';
import { CharSelect } from '@/modules/character_select';
import {
  CharacterList,
  listStatus,
  selectedCharacter,
} from '../../../shared/ui/pages/character_select/character_list';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuButton } from '@/controllers/interface/components/mu_button';
import './style.less';

const PLATE = { file: 'Data/Logo/0New_Account01.OZT', width: 256, height: 256 };

const FOOT = {
  file: 'Data/Logo/0New_Account02.OZT',
  width: 256,
  height: 77,
  top: 256,
};

const BUTTON = { file: 'Data/Logo/0On_Botton.OZJ', width: 70, height: 19 };

const ROW = { x: 20, y: 40, width: 216, height: 26 };

const CODE_FIELD = { file: 'Data/Logo/0Text_Box.OZJ', width: 124, height: 16 };

/** The two beds moulded into the foot piece, measured off the art. */
const CONNECT = { x: 56, y: FOOT.top + 36 };
const DELETE = { x: 142, y: FOOT.top + 36 };

const TEXT_COLOR = '#c8bfae';
const ACTIVE_COLOR = '#ffffff';

export const V097dCharactersPage = observer(() => {
  const [deleting, setDeleting] = useState(false);
  const [code, setCode] = useState('');

  const selected = selectedCharacter(CharSelect.charactersList, CharSelect.focusedChar);
  const status = listStatus(
    {
      loading: CharSelect.loadingCharactersList,
      count: CharSelect.charactersList.length,
      selected: !!selected,
    },
    'empty'
  );

  return (
    <div className="v097d-characters-page">
      <div className="v097d-characters-plate">
        <MuSpriteFrame
          file={PLATE.file}
          width={PLATE.width}
          height={PLATE.height}
        >
          {status === 'loading' && (
            <p className="v097d-characters-note">{t('characters.loading')}</p>
          )}

          {status === 'select' && (
            <p className="v097d-characters-note">{t('characters.select')}</p>
          )}

          <CharacterList source={CharSelect} look="rows" row={ROW} />

          {deleting && (
            <MuSpriteFrame
              file={CODE_FIELD.file}
              width={CODE_FIELD.width}
              height={CODE_FIELD.height}
              style={{ position: 'absolute', left: 66, top: 220 }}
            >
              <input
                className="v097d-characters-code"
                type="password"
                autoFocus
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </MuSpriteFrame>
          )}
        </MuSpriteFrame>

        <MuSpriteFrame
          file={FOOT.file}
          width={FOOT.width}
          height={FOOT.height}
          style={{ position: 'absolute', left: 0, top: FOOT.top }}
        />

        <MuButton
          file={BUTTON.file}
          width={BUTTON.width}
          height={BUTTON.height}
          frames={{ up: 0 }}
          label={t('common.ok')}
          color={TEXT_COLOR}
          activeColor={ACTIVE_COLOR}
          disabled={!selected}
          onClick={() => {
            if (selected) CharSelect.selectCharacterRequest(selected.Name);
          }}
          style={{ position: 'absolute', left: CONNECT.x, top: CONNECT.y }}
        />

        <MuButton
          file={BUTTON.file}
          width={BUTTON.width}
          height={BUTTON.height}
          frames={{ up: 0 }}
          label={deleting ? t('common.ok') : 'Delete'}
          color={TEXT_COLOR}
          activeColor={ACTIVE_COLOR}
          disabled={!selected}
          onClick={() => {
            if (!selected) return;

            if (!deleting) {
              setDeleting(true);
              return;
            }

            CharSelect.deleteCharacterRequest(selected.Name, code);
            setDeleting(false);
            setCode('');
          }}
          style={{ position: 'absolute', left: DELETE.x, top: DELETE.y }}
        />
      </div>
    </div>
  );
});
