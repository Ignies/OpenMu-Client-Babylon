import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { skills } from '../../../../../skills';
import { onCooldownTick } from '../../../../../skills/cooldowns';
import { isHotbarSkill } from '../../../../../common/skillCasting';
import { skillDefinition } from '../../../../../common/skillsDatabase';
import { MobileSkillSlots, MOBILE_SKILL_SLOTS } from '../../../../../common/mobileSkillSlots';
import { isAttackableEntity } from '../../../../../ecs/systems/attackSystem';
import { SkillIcon } from '../../../../components/skillIcon';
import { MobileButton, ScaledFrame } from './mobileButton';
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  SKILLBOX_SPRITE,
  SKILLBOX_USE_SPRITE,
  SLOT_SCALE,
} from './consts';

const SLOT_HEIGHT = BOX_HEIGHT * SLOT_SCALE;

/**
 * Fire the linked skill at whatever is targeted.
 *
 * This writes the one seam the right mouse button writes and stops there:
 * `SkillCastSystem` owns range, the walk into it, mana and AG, the re-use
 * delay, the clip and the packet. No combat rule is duplicated here.
 *
 * The point falls back to the hero's own tile with nothing targeted, which is
 * what a self-cast (Swell Life, the summons) or an area skill dropped where
 * you stand wants. A tap on the ground clears the request again
 * (`playerControllerSystem`) - the touch stand-in for letting the button go.
 */
function castSkill(number: number): void {
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero || hero.dying) return;

  Store.selectSkill(number);

  const picked = world.attackTarget;
  const target = picked && isAttackableEntity(world, picked) ? picked : null;
  const pos = target?.transform?.pos;

  world.castRequest = {
    target,
    point: pos
      ? { x: pos.x, y: pos.z }
      : { x: hero.transform.pos.x, y: hero.transform.pos.z },
    forced: false,
  };
}

/** The name of the held target, polled a frame at a time like the health bar. */
const TargetLabel = () => {
  const [name, setName] = useState('');

  useEffect(() => {
    let frame = 0;
    let shown = '';
    const poll = () => {
      frame = requestAnimationFrame(poll);
      const world = Store.world;
      const target = world?.attackTarget;
      const next =
        target && !target.dying && world && isAttackableEntity(world, target)
          ? (target.objectNameInWorld ?? '')
          : '';
      if (next === shown) return;
      shown = next;
      setName(next);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!name) return null;

  return <div className="mobile-target-label">{name}</div>;
};

/** One pad slot: the icon, the greyed state and the delay sweep of a bar slot. */
const PadSlot = observer(({ slot, onPick }: { slot: number; onPick: (slot: number) => void }) => {
  const number = MobileSkillSlots.slots[slot] ?? -1;
  const usable = number >= 0 && skills.requirementsMet(number);
  const selected = number >= 0 && number === Store.currentSkill;
  const sweep = useRef<HTMLDivElement>(null);

  // RenderSkillDelay: the sweep is written straight to the element on the
  // cooldown layer's tick, so a running delay never re-renders React.
  useEffect(() => {
    const tick = () => {
      const el = sweep.current;
      if (!el) return;
      const delay = number >= 0 ? skills.cooldown(number) : null;
      const css = delay ? `${Math.round(delay.fraction * SLOT_HEIGHT)}px` : '0px';
      if (el.style.height !== css) el.style.height = css;
    };
    tick();
    return onCooldownTick(tick);
  }, [number]);

  return (
    <MobileButton
      className="mobile-skill-slot"
      title={number >= 0 ? (skillDefinition(number)?.name ?? '') : t('skills.title')}
      onTap={() => (number >= 0 ? castSkill(number) : onPick(slot))}
      onLongPress={() => onPick(slot)}
    >
      {pressed => (
        <ScaledFrame
          file={pressed || selected ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          scale={SLOT_SCALE}
        >
          {number >= 0 && (
            <div className="mobile-skill-art">
              <SkillIcon number={number} disabled={!usable} />
            </div>
          )}
          <div ref={sweep} className="mobile-skill-delay" />
        </ScaledFrame>
      )}
    </MobileButton>
  );
});

/** Every learned skill that can sit on a bar, plus the entry that clears the slot. */
const SkillPicker = observer(({ slot, onClose }: { slot: number; onClose: () => void }) => {
  const learned = Store.skills.map(s => s.number).filter(isHotbarSkill);

  return (
    <div className="mobile-skill-picker" onPointerDown={onClose}>
      <div className="mobile-picker-panel" onPointerDown={e => e.stopPropagation()}>
        <div className="mobile-picker-title">{t('skills.title')}</div>

        {learned.length === 0 ? (
          <div className="mobile-picker-empty">{t('skills.empty')}</div>
        ) : (
          <div className="mobile-picker-grid">
            {learned.map(number => (
              <MobileButton
                key={number}
                className="mobile-picker-slot"
                title={skillDefinition(number)?.name ?? ''}
                onTap={() => {
                  MobileSkillSlots.assign(slot, number);
                  onClose();
                }}
              >
                {pressed => (
                  <ScaledFrame
                    file={pressed ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
                    width={BOX_WIDTH}
                    height={BOX_HEIGHT}
                    scale={SLOT_SCALE}
                  >
                    <div className="mobile-skill-art">
                      <SkillIcon number={number} disabled={!skills.requirementsMet(number)} />
                    </div>
                  </ScaledFrame>
                )}
              </MobileButton>
            ))}
          </div>
        )}

        <div className="mobile-picker-actions">
          <MobileButton
            className="mobile-picker-action"
            onTap={() => {
              MobileSkillSlots.assign(slot, -1);
              onClose();
            }}
          >
            {() => <span>{t('common.none')}</span>}
          </MobileButton>
          <MobileButton className="mobile-picker-action" onTap={onClose}>
            {() => <span>{t('common.close')}</span>}
          </MobileButton>
        </div>
      </div>
    </div>
  );
});

/**
 * Three skills within thumb reach, above the bar. A tap on a filled slot
 * casts; a tap on an empty one, or a long press on a filled one, opens the
 * picker. The link is remembered per character in the browser
 * (`mobileSkillSlots`) and never touches the ten server-saved digit keys.
 */
export const SkillPad = observer(() => {
  const [picking, setPicking] = useState(-1);
  const character = Store.playerData.name;
  const learned = Store.skills;

  useEffect(() => {
    if (character) MobileSkillSlots.use(character);
  }, [character]);

  useEffect(() => {
    MobileSkillSlots.prune(learned.map(s => s.number));
  }, [learned]);

  return (
    <>
      <div className="mobile-skill-pad">
        <TargetLabel />
        <div className="mobile-skill-slots">
          {Array.from({ length: MOBILE_SKILL_SLOTS }, (_, slot) => (
            <PadSlot key={slot} slot={slot} onPick={setPicking} />
          ))}
        </div>
      </div>

      {picking >= 0 && <SkillPicker slot={picking} onClose={() => setPicking(-1)} />}
    </>
  );
});
