import './style.less';
import { observer } from 'mobx-react-lite';
import { SessionResume } from '../../../common/sessionResume';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';

/**
 * What a dropped connection looks like while the client walks the login
 * flow again on its own (`common/sessionResume.ts`): a small plate over
 * whatever was on screen, saying which step it is on, with the way out.
 */
export const ReconnectOverlay = observer(() => {
  if (!SessionResume.active) return null;

  const line =
    SessionResume.step === 'logging-in'
      ? t('resume.loggingIn')
      : SessionResume.step === 'selecting'
        ? t('resume.selecting')
        : t('resume.connecting', { attempt: SessionResume.attempt });

  return (
    <div className="reconnect-overlay">
      <div className="reconnect-plate">
        <div className="reconnect-title">{t('resume.title')}</div>
        <div className="reconnect-line">{line}</div>
        <div
          className="reconnect-cancel"
          onClick={uiClick(() => SessionResume.giveUp('cancelled'))}
        >
          {t('resume.cancel')}
        </div>
      </div>
    </div>
  );
});
