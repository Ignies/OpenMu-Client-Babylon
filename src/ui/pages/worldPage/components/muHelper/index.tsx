import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { gameVersion } from '../../../../../version';
import { isKey } from '../../../../../common/keyBindings';
import { BaseClass, getBaseClass } from '../../../../../common/characterStats';
import {
  skillDefinition,
  type SkillDefinition,
} from '../../../../../common/skillsDatabase';
import { uiClick } from '../../../../../libs/sfx';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow } from '../../../../components/muWindow';
import { SkillIcon } from '../../../../components/skillIcon';
import {
  MAX_EXTRA_ITEM_CHARS,
  MAX_EXTRA_ITEMS,
  MAX_HUNTING_RANGE,
  MAX_OBTAINING_RANGE,
  type DarkRavenMode,
  type MuHelperConfig,
} from '../../../../../muHelper/config';
import {
  ensureMuHelperWatching,
  MuHelperState,
  resetMuHelperDraft,
  saveMuHelperConfig,
  toggleMuHelperWindow,
} from '../../../../../muHelper/state';

/**
 * `CNewUIMuHelper` (NewUIMuHelper.cpp): the S6 MU Helper settings dialog in
 * the 190 x 429 item-window frame. Two tabs (hunt / obtain); the original's
 * condition sub-window (`CNewUIMuHelperExt`) and skill-list popup
 * (`CNewUIMuHelperSkillList`) collapse into inline rows and an in-window
 * picker overlay. Class-conditional rows follow `RegisterBoxCharacter`.
 * Save encodes the 257-byte blob and sends `MuHelperSaveDataRequest`.
 */

const WINDOW_ID = 'mu-helper';

const TAB = { x: 12, y: 48, width: 56, height: 22 };
const TAB_SPRITE = 'newui_guild_tab04.OZT';
const CHECK_SPRITE = 'op2_ch.OZT';
const CHECK_SIZE = 16;
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
const EXIT_SPRITE = 'newui_exit_00.OZT';

type Draft = MuHelperConfig;

function edit(fn: (draft: Draft) => void): void {
  runInAction(() => fn(MuHelperState.draft));
}

const Check = ({
  label,
  checked,
  onChange,
  indent = 0,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  indent?: number;
}) => (
  <div
    className="helper-check"
    style={indent ? { marginLeft: indent } : undefined}
    onClick={uiClick(() => onChange(!checked))}
  >
    <MuSpriteFrame
      file={CHECK_SPRITE}
      y={checked ? CHECK_SIZE : 0}
      width={CHECK_SIZE}
      height={CHECK_SIZE}
    />
    <span>{label}</span>
  </div>
);

const NumberInput = ({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <input
    className="helper-number"
    type="text"
    inputMode="numeric"
    maxLength={3}
    value={value}
    onKeyDown={event => event.stopPropagation()}
    onChange={event => {
      const parsed = parseInt(event.target.value, 10);
      onChange(Math.max(0, Math.min(max, Number.isNaN(parsed) ? 0 : parsed)));
    }}
  />
);

const Stepper = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => (
  <div className="helper-stepper">
    <span className="helper-stepper-label">{label}</span>
    <button
      type="button"
      onClick={uiClick(() => onChange(Math.max(min, value - 1)))}
    >
      -
    </button>
    <span className="helper-stepper-value">{value}</span>
    <button
      type="button"
      onClick={uiClick(() => onChange(Math.min(max, value + 1)))}
    >
      +
    </button>
  </div>
);

/** `FilterByAttackSkills`: what an attack slot may hold. */
function isAttackSkill(def: SkillDefinition): boolean {
  return (
    (def.type === 'DirectHit' ||
      def.type === 'AreaSkillAutomaticHits' ||
      def.type === 'AreaSkillExplicitTarget') &&
    (def.damage > 0 || def.damageType !== 'None')
  );
}

/** `FilterByBuffSkills`: what a buff slot may hold. */
function isBuffSkill(def: SkillDefinition): boolean {
  return def.type === 'Buff' || def.type === 'Regeneration';
}

type PickerTarget =
  | { kind: 'skill'; index: 0 | 1 | 2 }
  | { kind: 'buff'; index: 0 | 1 | 2 };

const SkillSlot = ({
  num,
  onClick,
}: {
  num: number;
  onClick: () => void;
}) => (
  <div className="helper-skill-slot" onClick={uiClick(onClick)}>
    {num > 0 ? (
      <SkillIcon number={num} />
    ) : (
      <span className="helper-skill-empty">{t('muHelper.none')}</span>
    )}
  </div>
);

const SkillPicker = observer(
  ({
    target,
    onDone,
  }: {
    target: PickerTarget;
    onDone: () => void;
  }) => {
    const filter = target.kind === 'skill' ? isAttackSkill : isBuffSkill;
    const options = Store.skills
      .map(s => skillDefinition(s.number))
      .filter((def): def is SkillDefinition => !!def && filter(def));

    const pick = (num: number) => {
      edit(draft => {
        if (target.kind === 'skill') draft.skills[target.index] = num;
        else draft.buffs[target.index] = num;
      });
      onDone();
    };

    return (
      <div className="helper-picker" data-no-drag="true">
        <div className="helper-picker-title">{t('muHelper.pickSkill')}</div>
        <div className="helper-picker-list">
          <div className="helper-picker-row" onClick={uiClick(() => pick(0))}>
            <span>{t('muHelper.none')}</span>
          </div>
          {options.length === 0 && (
            <div className="helper-picker-empty">{t('muHelper.noSkills')}</div>
          )}
          {options.map(def => (
            <div
              key={def.num}
              className="helper-picker-row"
              onClick={uiClick(() => pick(def.num))}
            >
              <SkillIcon number={def.num} />
              <span>{def.name}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={uiClick(onDone)}>
          {t('common.close')}
        </button>
      </div>
    );
  }
);

/** One activation skill block: slot + timer/condition rows (Ext window port). */
const ActivationSkill = observer(
  ({
    index,
    onPick,
  }: {
    index: 1 | 2;
    onPick: () => void;
  }) => {
    const draft = MuHelperState.draft;
    const cond = draft.skillConditions[index];

    return (
      <div className="helper-block">
        <div className="helper-row">
          <span className="helper-label">
            {t('muHelper.activationSkill', { index })}
          </span>
          <SkillSlot num={draft.skills[index]} onClick={onPick} />
        </div>
        <div className="helper-row">
          <Check
            label={t('muHelper.timer')}
            checked={cond.onTimer}
            indent={10}
            onChange={value =>
              edit(d => {
                d.skillConditions[index].onTimer = value;
                if (value) d.skillConditions[index].onCondition = false;
              })
            }
          />
          <NumberInput
            value={draft.skillIntervals[index]}
            max={999}
            onChange={value => edit(d => (d.skillIntervals[index] = value))}
          />
        </div>
        <div className="helper-row">
          <Check
            label={t('muHelper.condition')}
            checked={cond.onCondition}
            indent={10}
            onChange={value =>
              edit(d => {
                d.skillConditions[index].onCondition = value;
                if (value) d.skillConditions[index].onTimer = false;
              })
            }
          />
        </div>
        {cond.onCondition && (
          <>
            <div className="helper-row">
              <button
                type="button"
                className="helper-cycle"
                onClick={uiClick(() =>
                  edit(d => {
                    const c = d.skillConditions[index];
                    c.basis = c.basis === 'nearby' ? 'attacking' : 'nearby';
                  })
                )}
              >
                {t(
                  cond.basis === 'nearby'
                    ? 'muHelper.basisNearby'
                    : 'muHelper.basisAttacking'
                )}
              </button>
              <button
                type="button"
                className="helper-cycle"
                onClick={uiClick(() =>
                  edit(d => {
                    const c = d.skillConditions[index];
                    c.minMobs = c.minMobs >= 5 ? 2 : c.minMobs + 1;
                  })
                )}
              >
                {t('muHelper.minMobs', { count: cond.minMobs })}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);

const HuntTab = observer(
  ({ onPick }: { onPick: (target: PickerTarget) => void }) => {
    const draft = MuHelperState.draft;
    const baseClass = getBaseClass(Store.playerData.charClass);
    const knight = baseClass === BaseClass.Knight;
    const elf = baseClass === BaseClass.Elf;
    const summoner = baseClass === BaseClass.Summoner;
    const darkLord = baseClass === BaseClass.DarkLord;
    const partyClass = baseClass === BaseClass.Wizard || elf;

    return (
      <>
        <Stepper
          label={t('muHelper.huntRange')}
          value={draft.huntingRange}
          min={0}
          max={MAX_HUNTING_RANGE}
          onChange={value => edit(d => (d.huntingRange = value))}
        />
        <div className="helper-row">
          <Check
            label={t('muHelper.returnToPosition')}
            checked={draft.returnToOriginalPosition}
            onChange={value => edit(d => (d.returnToOriginalPosition = value))}
          />
        </div>
        <div className="helper-row">
          <span className="helper-label" style={{ marginLeft: 10 }}>
            {t('muHelper.awaySeconds')}
          </span>
          <NumberInput
            value={draft.maxSecondsAway}
            max={15}
            onChange={value => edit(d => (d.maxSecondsAway = value))}
          />
        </div>
        <div className="helper-row">
          <Check
            label={t('muHelper.longRange')}
            checked={draft.longRangeCounterAttack}
            onChange={value => edit(d => (d.longRangeCounterAttack = value))}
          />
        </div>

        <div className="helper-row">
          <span className="helper-label">{t('muHelper.basicSkill')}</span>
          <SkillSlot
            num={draft.skills[0]}
            onClick={() => onPick({ kind: 'skill', index: 0 })}
          />
        </div>
        <ActivationSkill
          index={1}
          onPick={() => onPick({ kind: 'skill', index: 1 })}
        />
        {!darkLord && (
          <ActivationSkill
            index={2}
            onPick={() => onPick({ kind: 'skill', index: 2 })}
          />
        )}
        {knight && (
          <div className="helper-row">
            <Check
              label={t('muHelper.combo')}
              checked={draft.useCombo}
              onChange={value => edit(d => (d.useCombo = value))}
            />
          </div>
        )}

        <div className="helper-section">{t('muHelper.buffs')}</div>
        <div className="helper-row helper-buff-slots">
          {([0, 1, 2] as const).map(i => (
            <SkillSlot
              key={i}
              num={draft.buffs[i]}
              onClick={() => onPick({ kind: 'buff', index: i })}
            />
          ))}
        </div>
        <div className="helper-row">
          <Check
            label={t('muHelper.buffDuration')}
            checked={draft.buffDuration}
            onChange={value => edit(d => (d.buffDuration = value))}
          />
        </div>
        {partyClass && (
          <div className="helper-row">
            <Check
              label={t('muHelper.buffDurationParty')}
              checked={draft.buffDurationParty}
              onChange={value => edit(d => (d.buffDurationParty = value))}
            />
          </div>
        )}
        <div className="helper-row">
          <span className="helper-label" style={{ marginLeft: 10 }}>
            {t('muHelper.buffInterval')}
          </span>
          <NumberInput
            value={draft.buffCastInterval}
            max={999}
            onChange={value => edit(d => (d.buffCastInterval = value))}
          />
        </div>
        {partyClass && (
          <div className="helper-row">
            <Check
              label={t('muHelper.supportParty')}
              checked={draft.supportParty}
              onChange={value => edit(d => (d.supportParty = value))}
            />
          </div>
        )}

        {elf && (
          <>
            <div className="helper-row">
              <Check
                label={t('muHelper.autoHeal')}
                checked={draft.autoHeal}
                onChange={value => edit(d => (d.autoHeal = value))}
              />
              <span className="helper-hint">
                {t('muHelper.atPercentHp', { percent: draft.healThreshold })}
              </span>
            </div>
            <Stepper
              label=""
              value={draft.healThreshold / 10}
              min={0}
              max={10}
              onChange={value => edit(d => (d.healThreshold = value * 10))}
            />
            <div className="helper-row">
              <Check
                label={t('muHelper.partyHeal')}
                checked={draft.autoHealParty}
                onChange={value => edit(d => (d.autoHealParty = value))}
              />
              <span className="helper-hint">
                {t('muHelper.atPercentHp', {
                  percent: draft.healPartyThreshold,
                })}
              </span>
            </div>
            <Stepper
              label=""
              value={draft.healPartyThreshold / 10}
              min={0}
              max={10}
              onChange={value => edit(d => (d.healPartyThreshold = value * 10))}
            />
          </>
        )}

        <div className="helper-row">
          <Check
            label={t('muHelper.potion')}
            checked={draft.useHealPotion}
            onChange={value => edit(d => (d.useHealPotion = value))}
          />
          <span className="helper-hint">
            {t('muHelper.atPercentHp', { percent: draft.potionThreshold })}
          </span>
        </div>
        <Stepper
          label=""
          value={draft.potionThreshold / 10}
          min={0}
          max={10}
          onChange={value => edit(d => (d.potionThreshold = value * 10))}
        />

        {summoner && (
          <div className="helper-row">
            <Check
              label={t('muHelper.drainLife')}
              checked={draft.useDrainLife}
              onChange={value => edit(d => (d.useDrainLife = value))}
            />
          </div>
        )}

        {darkLord && (
          <>
            <div className="helper-row">
              <Check
                label={t('muHelper.useRaven')}
                checked={draft.useDarkRaven}
                onChange={value => edit(d => (d.useDarkRaven = value))}
              />
            </div>
            {(
              [
                [0, 'muHelper.ravenCease'],
                [1, 'muHelper.ravenAuto'],
                [2, 'muHelper.ravenTogether'],
              ] as const
            ).map(([mode, key]) => (
              <div className="helper-row" key={mode}>
                <Check
                  label={t(key)}
                  checked={draft.darkRavenMode === mode}
                  indent={10}
                  onChange={() =>
                    edit(d => (d.darkRavenMode = mode as DarkRavenMode))
                  }
                />
              </div>
            ))}
          </>
        )}
      </>
    );
  }
);

const ObtainTab = observer(() => {
  const draft = MuHelperState.draft;
  const [itemName, setItemName] = useState('');
  const [selected, setSelected] = useState(-1);

  const addItem = () => {
    const name = itemName.trim().slice(0, MAX_EXTRA_ITEM_CHARS);
    if (!name) return;
    edit(d => {
      if (d.extraItems.length >= MAX_EXTRA_ITEMS) return;
      if (!d.extraItems.includes(name)) d.extraItems.push(name);
    });
    setItemName('');
  };

  return (
    <>
      <div className="helper-row">
        <Check
          label={t('muHelper.repair')}
          checked={draft.repairItem}
          onChange={value => edit(d => (d.repairItem = value))}
        />
      </div>
      <Stepper
        label={t('muHelper.obtainRange')}
        value={draft.obtainRange}
        min={1}
        max={MAX_OBTAINING_RANGE}
        onChange={value => edit(d => (d.obtainRange = value))}
      />
      <div className="helper-row">
        <Check
          label={t('muHelper.pickAll')}
          checked={draft.pickAllItems}
          onChange={value => edit(d => (d.pickAllItems = value))}
        />
      </div>
      <div className="helper-row">
        <Check
          label={t('muHelper.pickSelected')}
          checked={draft.pickSelectedItems}
          onChange={value => edit(d => (d.pickSelectedItems = value))}
        />
      </div>
      <div className="helper-grid">
        <Check
          label={t('muHelper.pickJewel')}
          checked={draft.pickJewel}
          onChange={value => edit(d => (d.pickJewel = value))}
        />
        <Check
          label={t('muHelper.pickAncient')}
          checked={draft.pickAncient}
          onChange={value => edit(d => (d.pickAncient = value))}
        />
        <Check
          label={t('muHelper.pickZen')}
          checked={draft.pickZen}
          onChange={value => edit(d => (d.pickZen = value))}
        />
        <Check
          label={t('muHelper.pickExcellent')}
          checked={draft.pickExcellent}
          onChange={value => edit(d => (d.pickExcellent = value))}
        />
      </div>
      <div className="helper-row">
        <Check
          label={t('muHelper.pickExtra')}
          checked={draft.pickExtraItems}
          onChange={value => edit(d => (d.pickExtraItems = value))}
        />
      </div>
      <div className="helper-row">
        <input
          className="helper-item-input"
          type="text"
          maxLength={MAX_EXTRA_ITEM_CHARS}
          placeholder={t('muHelper.itemName')}
          value={itemName}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Enter') addItem();
          }}
          onChange={event => setItemName(event.target.value)}
        />
        <button type="button" onClick={uiClick(addItem)}>
          {t('muHelper.addItem')}
        </button>
      </div>
      <div className="helper-item-list">
        {draft.extraItems.map((name, i) => (
          <div
            key={`${name}-${i}`}
            className={`helper-item-row${selected === i ? ' selected' : ''}`}
            onClick={() => setSelected(i)}
          >
            {name}
          </div>
        ))}
      </div>
      <div className="helper-row">
        <button
          type="button"
          disabled={selected < 0 || selected >= draft.extraItems.length}
          onClick={uiClick(() => {
            edit(d => {
              d.extraItems.splice(selected, 1);
            });
            setSelected(-1);
          })}
        >
          {t('muHelper.removeItem')}
        </button>
      </div>
    </>
  );
});

export const MuHelperWindow = observer(() => {
  const open = MuHelperState.windowOpen;
  const [tab, setTab] = useState(0);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  useEventBus('keyPressed', key => {
    if (!gameVersion.features.muHelper) return;
    if (isKey('muHelperConfig', key) && Store.world?.playerEntity) {
      toggleMuHelperWindow();
    }
  });

  useEffect(() => {
    if (open) ensureMuHelperWatching();
    if (!open) setPicker(null);
  }, [open]);

  if (!gameVersion.features.muHelper || !open) return null;

  const close = () => toggleMuHelperWindow(false);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="mu-helper-window"
      column={1}
      label={t('muHelper.title')}
      onClose={close}
    >
      <div className="helper-title">{t('muHelper.title')}</div>

      {[t('muHelper.tabHunt'), t('muHelper.tabObtain')].map((name, i) => (
        <div
          key={name}
          data-no-drag="true"
          style={{
            position: 'absolute',
            left: TAB.x + i * TAB.width,
            top: TAB.y,
          }}
        >
          <MuButton
            file={TAB_SPRITE}
            width={TAB.width}
            height={TAB.height}
            frames={{ up: 0, down: 1, check: 1 }}
            checked={tab === i}
            label={name}
            labelStyle={{ fontSize: 10 }}
            onClick={() => {
              setTab(i);
              setPicker(null);
            }}
          />
        </div>
      ))}

      <div className="helper-body" data-no-drag="true">
        {tab === 0 ? <HuntTab onPick={setPicker} /> : <ObtainTab />}
      </div>

      {picker && (
        <SkillPicker target={picker} onDone={() => setPicker(null)} />
      )}

      <div className="helper-actions" data-no-drag="true">
        <button type="button" onClick={uiClick(resetMuHelperDraft)}>
          {t('muHelper.init')}
        </button>
        <button type="button" onClick={uiClick(saveMuHelperConfig)}>
          {t('muHelper.save')}
        </button>
      </div>

      <div
        data-no-drag="true"
        style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={close}
        />
      </div>
    </MuItemWindow>
  );
});
