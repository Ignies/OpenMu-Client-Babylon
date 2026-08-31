import { t } from '../../../i18n';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { Store } from '../../../store';
import { MuButton } from '../../components/muButton';
import { MuSpriteFrame } from '../../components/muSprite';
import { TEXT_COLOR } from '../serversPage/layout';
import { createClassPreview, type ClassPreview } from './classPreview';
import {
  ACTION_BTN_FRAMES,
  ACTION_BTN_HEIGHT,
  ACTION_BTN_WIDTH,
  ACTION_BTN_Y,
  CANCEL_BTN_X,
  COLUMN_X,
  COMMAND_LABEL_KEY,
  COMMAND_VALUE,
  CREATABLE_CLASSES,
  CREATE_MESSAGES,
  CLASS_TYPE,
  DESC_HEIGHT,
  DESC_LINE_MAX,
  DESC_LINE_SPACING,
  DESC_ROW_MAX,
  DESC_TEXT_X,
  DESC_TEXT_Y,
  DESC_WIDTH,
  DESC_X,
  DESC_Y,
  hasSpecialCharacters,
  INPUT_HEIGHT,
  INPUT_TEXT_HEIGHT,
  INPUT_TEXT_WIDTH,
  INPUT_TEXT_X,
  INPUT_TEXT_Y,
  INPUT_WIDTH,
  INPUT_X,
  INPUT_Y,
  JOB_BTN_FRAMES,
  JOB_BTN_HEIGHT,
  JOB_BTN_WIDTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  OK_BTN_X,
  PANEL_ALPHA,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  separateTextIntoLines,
  STAT_HEIGHT,
  STAT_HEIGHT_DARK_LORD,
  STAT_LABEL_KEYS,
  STAT_LINE_SPACING,
  STAT_TEXT_X,
  STAT_TEXT_Y,
  STAT_VALUE_X,
  STAT_WIDTH,
  STAT_X,
  STAT_Y,
  WIN_HEIGHT,
  WIN_WIDTH,
} from './layout';

type CharMakeWinProps = {
  onClose: () => void;
};

export const CharMakeWin = observer(({ onClose }: CharMakeWinProps) => {
  const selected =
    CREATABLE_CLASSES.find(c => c.netClass === Store.newCharClass) ??
    CREATABLE_CLASSES[0];

  const isDarkLord = selected.classType === CLASS_TYPE.DARK_LORD;

  const previewRef = useRef<HTMLDivElement>(null);
  const preview = useRef<ClassPreview | null>(null);

  useEffect(() => {
    const world = Store.world;
    if (!world) return;

    const instance = createClassPreview(world, () =>
      previewRef.current?.getBoundingClientRect() ?? null
    );

    preview.current = instance;

    return () => {
      preview.current = null;
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    preview.current?.setClass(selected.classType);
  }, [selected.classType]);

  const isUnlocked = (unlock: number | null) =>
    unlock === null || (Store.creationUnlockFlags & unlock) !== 0;

  const onCreate = () => {
    if (Store.charCreationPending) return;

    const name = Store.newCharName;

    if (name.length < NAME_MIN_LENGTH) {
      Store.addNotification(CREATE_MESSAGES.minLength, 'error');
      return;
    }

    if (hasSpecialCharacters(name)) {
      Store.addNotification(CREATE_MESSAGES.specialName, 'error');
      return;
    }

    Store.createCharacterRequest(name, selected.netClass);
  };

  const descriptionLines = separateTextIntoLines(
    t(selected.descriptionKey),
    DESC_LINE_MAX,
    DESC_ROW_MAX
  );

  return (
    <div
      className="char-make-win"
      style={{ width: WIN_WIDTH, height: WIN_HEIGHT }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCreate();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {}
      <div
        ref={previewRef}
        className="char-make-preview"
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      />

      {}
      <div
        className="char-make-panel"
        style={{
          left: STAT_X,
          top: STAT_Y,
          width: STAT_WIDTH,
          height: isDarkLord ? STAT_HEIGHT_DARK_LORD : STAT_HEIGHT,
          background: `rgba(0, 0, 0, ${PANEL_ALPHA})`,
        }}
      />

      {}
      {STAT_LABEL_KEYS.map((labelKey, i) => {
        const top = STAT_Y + STAT_TEXT_Y + i * STAT_LINE_SPACING;

        return (
          <div key={labelKey}>
            <span
              className="char-make-stat"
              style={{ left: STAT_X + STAT_TEXT_X, top }}
            >
              {t(labelKey)}
            </span>
            <span
              className="char-make-stat char-make-stat-value"
              style={{ left: STAT_X + STAT_VALUE_X, top }}
            >
              {selected.stats[i]}
            </span>
          </div>
        );
      })}

      {isDarkLord && (
        <>
          <span
            className="char-make-stat"
            style={{
              left: STAT_X + STAT_TEXT_X,
              top: STAT_Y + STAT_TEXT_Y + 4 * STAT_LINE_SPACING,
            }}
          >
            {t(COMMAND_LABEL_KEY)}
          </span>
          <span
            className="char-make-stat char-make-stat-value"
            style={{
              left: STAT_X + STAT_VALUE_X,
              top: STAT_Y + STAT_TEXT_Y + 4 * STAT_LINE_SPACING,
            }}
          >
            {COMMAND_VALUE}
          </span>
        </>
      )}

      {}
      {CREATABLE_CLASSES.map(cls => {
        const enabled = isUnlocked(cls.unlock);

        return (
          <MuButton
            key={cls.classType}
            file="cha_bt.OZT"
            width={JOB_BTN_WIDTH}
            height={JOB_BTN_HEIGHT}
            frames={JOB_BTN_FRAMES}
            label={t(cls.nameKey)}
            color={enabled ? TEXT_COLOR.brightGray : '#777777'}
            activeColor={TEXT_COLOR.white}
            checked={cls.classType === selected.classType}
            disabled={!enabled}
            onClick={() => {
              Store.newCharClass = cls.netClass;
            }}
            style={{ position: 'absolute', left: COLUMN_X, top: cls.y }}
            labelStyle={{ fontSize: 11, textShadow: '1px 1px 0 rgba(0,0,0,.85)' }}
          />
        );
      })}

      {}
      <MuSpriteFrame
        file="cha_id.OZT"
        width={INPUT_WIDTH}
        height={INPUT_HEIGHT}
        style={{ position: 'absolute', left: INPUT_X, top: INPUT_Y }}
      >
        <input
          className="char-make-input"
          type="text"
          autoFocus
          spellCheck={false}
          value={Store.newCharName}
          maxLength={NAME_MAX_LENGTH}
          onChange={e => (Store.newCharName = e.target.value)}
          style={{
            left: INPUT_TEXT_X,
            top: INPUT_TEXT_Y,
            width: INPUT_TEXT_WIDTH,
            height: INPUT_TEXT_HEIGHT,
          }}
        />
      </MuSpriteFrame>

      <MuButton
        file="message_ok_b_all.OZT"
        width={ACTION_BTN_WIDTH}
        height={ACTION_BTN_HEIGHT}
        frames={ACTION_BTN_FRAMES}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        disabled={Store.charCreationPending}
        onClick={onCreate}
        style={{ position: 'absolute', left: OK_BTN_X, top: ACTION_BTN_Y }}
      />
      <MuButton
        file="loding_cancel_b_all.OZT"
        width={ACTION_BTN_WIDTH}
        height={ACTION_BTN_HEIGHT}
        frames={ACTION_BTN_FRAMES}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        onClick={onClose}
        style={{ position: 'absolute', left: CANCEL_BTN_X, top: ACTION_BTN_Y }}
      />

      {}
      <div
        className="char-make-panel"
        style={{
          left: DESC_X,
          top: DESC_Y,
          width: DESC_WIDTH,
          height: DESC_HEIGHT,
          background: `rgba(0, 0, 0, ${PANEL_ALPHA})`,
        }}
      />
      {descriptionLines.map((line, i) => (
        <span
          key={i}
          className="char-make-desc"
          style={{
            left: DESC_X + DESC_TEXT_X,
            top: DESC_Y + DESC_TEXT_Y + i * DESC_LINE_SPACING,
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
});
