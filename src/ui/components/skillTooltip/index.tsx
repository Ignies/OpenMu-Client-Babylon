import { t } from '../../../i18n';
import './style.less';
import { observer } from 'mobx-react-lite';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { skillDefinition } from '../../../common/skillsDatabase';
import { skills, type SkillBlock } from '../../../skills';
import { skillDelaySeconds } from '../../../skills/cooldowns';

type Line = { text: string; color: 'white' | 'blue' | 'darkRed' | 'gray'; bold?: boolean; blank?: boolean };

/** `RenderSkillInfo`'s dark-red requirement lines, one per failed gate. */
const BLOCK_TEXT: Record<SkillBlock, (req: { level: number; energy: number; mana: number; ag: number }) => string> = {
  unknown: () => t('skills.tooltip.unknown'),
  class: () => t('skills.tooltip.class'),
  level: r => t('skills.tooltip.level', { level: r.level }),
  energy: r => t('skills.tooltip.energy', { energy: r.energy }),
  weapon: () => t('skills.tooltip.weapon'),
  mana: r => t('skills.tooltip.mana', { mana: r.mana }),
  ag: r => t('skills.tooltip.ag', { ag: r.ag }),
  cooldown: () => t('skills.tooltip.cooldown'),
};

/**
 * The lines of `RenderSkillInfo` (ZzzInventory.cpp:6024) for one hotbar
 * skill: a blank, the name in bold blue, a blank, then damage / distance
 * (GlobalText 170, 174), mana (175), AG (360), and every requirement the
 * hero fails in dark red, the delay last. Pure data so the skill-list window
 * can reuse it.
 */
export function buildSkillTooltip(number: number, level = 0): Line[] {
  const def = skillDefinition(number);
  if (!def) {
    return [
      { text: t('skills.unnamed', { number }), color: 'blue', bold: true },
    ];
  }

  const { blocks } = skills.usability(number);
  const lines: Line[] = [
    { text: '', color: 'white', blank: true },
    {
      text: level > 0 ? t('skills.named', { name: def.name, level }) : def.name,
      color: 'blue',
      bold: true,
    },
    { text: '', color: 'white', blank: true },
  ];

  if (def.damage > 0) {
    lines.push({ text: t('skills.damage', { value: def.damage }), color: 'white' });
  }
  if (def.distance > 0) {
    lines.push({ text: t('skills.distance', { value: def.distance }), color: 'white' });
  }
  lines.push({ text: t('skills.mana', { value: def.mana }), color: 'white' });
  if (def.ag > 0) {
    lines.push({ text: t('skills.ag', { value: def.ag }), color: 'white' });
  }

  const delay = skillDelaySeconds(number);
  if (delay > 0) {
    const cd = skills.cooldown(number);
    lines.push({
      text: cd
        ? t('skills.readyIn', { seconds: cd.remaining.toFixed(1) })
        : t('skills.delay', { seconds: delay }),
      color: cd ? 'gray' : 'white',
    });
  }

  for (const block of blocks) {
    if (block === 'cooldown') continue; // already the "Ready in" line
    lines.push({ text: BLOCK_TEXT[block](def), color: 'darkRed' });
  }

  return lines;
}

/**
 * `RenderSkillInfo` via `RenderTipTextList`: the black 80% box hanging off
 * the cursor, kept inside the viewport, portalled so no window clips it.
 */
export const SkillTooltip = observer(
  ({ number, level = 0, x, y }: { number: number; level?: number; x: number; y: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const lines = buildSkillTooltip(number, level);

    useLayoutEffect(() => {
      const box = ref.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const margin = 2;
      let left = x - rect.width / 2;
      // The bar sits at the bottom: the tip hangs above the cursor by default.
      let top = y - 8 - rect.height;
      if (left + rect.width > window.innerWidth - margin) left = window.innerWidth - margin - rect.width;
      if (left < margin) left = margin;
      if (top < margin) top = y + 16;
      box.style.left = `${Math.round(left)}px`;
      box.style.top = `${Math.round(top)}px`;
    });

    return createPortal(
      <div ref={ref} className="mu-skill-tooltip">
        {lines.map((line, i) =>
          line.blank ? (
            <div key={i} className="mu-skill-tooltip-gap" />
          ) : (
            <div key={i} className={`mu-skill-tooltip-line color-${line.color}${line.bold ? ' bold' : ''}`}>
              {line.text}
            </div>
          )
        )}
      </div>,
      document.body
    );
  }
);
