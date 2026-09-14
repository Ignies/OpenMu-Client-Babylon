import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { gmCommand } from '../../../../common/gmCommands';
import { CommandCard, CommandFields, RunButton } from '../commandForm';

/** A read and a write of the same value, side by side. */
const StatPair = observer(
  ({ get, set, labelKey }: { get: string; set: string; labelKey: TextKey }) => (
    <div className="gm-pairline">
      <span className="gm-pairline-label">{t(labelKey)}</span>
      <RunButton command={gmCommand(get)} labelKey="gm.action.read" compact />
      <CommandFields command={gmCommand(set)} hide={['characterName']} bare />
      <RunButton command={gmCommand(set)} labelKey="gm.action.set" compact />
    </div>
  )
);

/**
 * One character, read and written. The name is the shared target, so a
 * click on a player in Live or on the Map lands here already filled in.
 */
export const CharacterTab = observer(() => (
  <div className="gm-grid-2 gm-character">
    <section className="gm-card">
      <label className="gm-field">
        <span className="gm-field-label">{t('gm.param.character')}</span>
        <input
          className="gm-input"
          type="text"
          value={GmPanel.target}
          placeholder={t('gm.hint.blankIsYou')}
          spellCheck={false}
          autoComplete="off"
          onChange={e => GmPanel.setTarget(e.target.value)}
        />
      </label>
      <p className="gm-hint">{t('gm.character.targetHint')}</p>

      <div className="gm-quick">
        <RunButton command={gmCommand('/charinfo')} labelKey="gm.cmd.charinfo.label" compact />
        <RunButton command={gmCommand('/clearinv')} labelKey="gm.cmd.clearinv.label" compact />
      </div>

      <h4 className="gm-section-title">{t('gm.character.values')}</h4>
      <StatPair labelKey="common.level" get="/getlevel" set="/setlevel" />
      <StatPair labelKey="common.zen" get="/getmoney" set="/setmoney" />
      <StatPair labelKey="gm.param.resets" get="/getresets" set="/setresets" />
      <StatPair labelKey="gm.param.points" get="/getleveluppoints" set="/setleveluppoints" />
      <StatPair labelKey="gm.param.masterLevel" get="/getmasterlevel" set="/setmasterlevel" />
      <StatPair
        labelKey="gm.param.masterPoints"
        get="/getmasterleveluppoints"
        set="/setmasterleveluppoints"
      />
    </section>

    <div>
      <h4 className="gm-section-title">{t('gm.character.stats')}</h4>
      <CommandCard command={gmCommand('/get')} hide={['characterName']} />
      <CommandCard command={gmCommand('/set')} hide={['characterName']} />

      <h4 className="gm-section-title">{t('gm.character.heroState')}</h4>
      <CommandCard command={gmCommand('/pk')} hide={['characterName']} />
    </div>
  </div>
));
