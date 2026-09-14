import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { gmCommand } from '../../../../common/gmCommands';
import { uiClick } from '../../../../libs/sfx';
import { CommandCard } from '../commandForm';

/** Everything that takes access away. Each one confirms before it sends. */
export const ModerationTab = observer(() => (
  <div className="gm-moderation">
    {GmPanel.target ? (
      <p className="gm-target-note">
        {t('gm.actingOn')} <b>{GmPanel.target}</b>
        <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setTarget(''))}>
          {t('gm.clear')}
        </button>
      </p>
    ) : (
      <p className="gm-hint">{t('gm.moderation.pickHint')}</p>
    )}

    <div className="gm-grid-3">
      <div>
        <h4 className="gm-section-title">{t('gm.moderation.characters')}</h4>
        <CommandCard command={gmCommand('/banchar')} hide={['characterName']} />
        <CommandCard command={gmCommand('/unbanchar')} hide={['characterName']} />
        <CommandCard command={gmCommand('/chatban')} hide={['characterName']} />
        <CommandCard command={gmCommand('/chatunban')} hide={['characterName']} />
        <CommandCard command={gmCommand('/disconnect')} hide={['characterName']} />
      </div>
      <div>
        <h4 className="gm-section-title">{t('gm.moderation.accounts')}</h4>
        <CommandCard command={gmCommand('/banacc')} />
        <CommandCard command={gmCommand('/unbanacc')} />
      </div>
      <div>
        <h4 className="gm-section-title">{t('gm.moderation.guilds')}</h4>
        <CommandCard command={gmCommand('/guilddisconnect')} />
        <CommandCard command={gmCommand('/guildmove')} />
      </div>
    </div>
  </div>
));
