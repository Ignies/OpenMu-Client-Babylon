import { action, makeObservable, observable } from 'mobx';
import { SaveKeyConfigurationPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Session } from '../session';
import { isHotbarSkill } from './skillCasting';

/**
 * The hero's learned skills (F3 11), the selected one (`Hero->CurrentSkill`), its active effects
 * (the buff bar) and the ten skill hot keys with the layout the server saved.
 */
export const HeroSkills = new (class {
  /** Learned skills from SkillListUpdate / SkillAdded / SkillRemoved (F3 11). */
  skills: { index: number; number: number; level: number }[] = [];

  /** Hero->CurrentSkill as a wire skill number; -1 = plain attack. */
  currentSkill = -1;

  /** Active MagicEffectStatus effect ids of the hero (buff bar). */
  buffs: number[] = [];

  setBuff(effectId: number, active: boolean) {
    const has = this.buffs.includes(effectId);
    if (active && !has) this.buffs = this.buffs.concat(effectId);
    else if (!active && has) this.buffs = this.buffs.filter(b => b !== effectId);
  }

  /** Digit keys 1..9,0 → skill number (CNewUISkillList hot keys). */
  skillHotkeys: number[] = new Array(10).fill(-1);

  /**
   * `ApplyKeyConfiguration` (F3 30, `ReceiveOption`): the hot keys the server
   * saved for this character, by slot. Kept apart from `skillHotkeys` because
   * the packet may land before the skill list does; `refreshSkillSelection`
   * re-applies them once the skill is known.
   */
  savedSkillHotkeys: number[] = new Array(10).fill(-1);

  /** Restore the server-saved hot keys (`g_pMainFrame->SetSkillHotKey`). */
  applyKeyConfiguration(hotkeys: number[]) {
    const next = new Array(10).fill(-1);
    for (let i = 0; i < 10 && i < hotkeys.length; i++) next[i] = hotkeys[i];
    this.savedSkillHotkeys = next;
    this.refreshSkillSelection();
  }

  setSkillList(list: { index: number; number: number; level: number }[]) {
    this.skills = list.slice().sort((a, b) => a.index - b.index);
    this.refreshSkillSelection();
  }

  addSkill(skill: { index: number; number: number; level: number }) {
    this.skills = this.skills
      .filter(s => s.number !== skill.number)
      .concat(skill)
      .sort((a, b) => a.index - b.index);
    this.refreshSkillSelection();
  }

  removeSkill(number: number) {
    this.skills = this.skills.filter(s => s.number !== number);
    this.refreshSkillSelection();
  }

  selectSkill(number: number) {
    this.currentSkill = this.skills.some(s => s.number === number) ? number : -1;
  }

  /**
   * `CNewUISkillList::SetHotKey` (NewUIMainFrameWindow.cpp:1803): a skill
   * sits on one key only, so the key it held before is cleared. The layout
   * is sent to the server right away (the original saves it on leaving the
   * world; OpenMU accepts it at any time) so it survives a relog.
   */
  assignSkillHotkey(slot: number, number: number) {
    if (slot < 0 || slot > 9) return;
    const next = this.skillHotkeys.map(n => (n === number ? -1 : n));
    next[slot] = number;
    this.skillHotkeys = next;
    this.savedSkillHotkeys = next.slice();
    this.saveKeyConfiguration();
  }

  /**
   * `SaveOptions` (ZzzOpenData.cpp:4764): F3 30 with the ten hot keys as
   * big-endian skill numbers (0xFFFF = empty) followed by the option bytes
   * the client does not model yet (game options, Q/W/E/R, chat log, R,
   * QWER level), left zero.
   */
  private saveKeyConfiguration(): void {
    if (Session.isOffline) return;
    const packet = SaveKeyConfigurationPacket.createPacket(4 + 20 + 1 + 3 + 1 + 1 + 1);
    const data = packet.buffer;
    for (let i = 0; i < 10; i++) {
      const number = this.skillHotkeys[i];
      data.setUint16(4 + i * 2, number >= 0 ? number : 0xffff, false);
    }
    Session.sendToGS(packet.buffer);
  }

  private refreshSkillSelection() {
    if (!this.skills.some(s => s.number === this.currentSkill)) {
      this.currentSkill = -1;
    }
    // Unassigned hot keys default to the learned skills in order (1..9, 0).
    const next = this.skillHotkeys.map(n =>
      this.skills.some(s => s.number === n) ? n : -1
    );
    // Server-saved hot keys win over the defaults once the skill is learned.
    for (let slot = 0; slot < 10; slot++) {
      const saved = this.savedSkillHotkeys[slot];
      if (saved === -1 || next[slot] === saved) continue;
      if (!this.skills.some(s => s.number === saved)) continue;
      const prev = next.indexOf(saved);
      if (prev !== -1) next[prev] = -1;
      next[slot] = saved;
    }
    const used = new Set(next);
    // Master-tree entries and the siege commands are learned skills that never
    // sit on a bar slot, so they never claim one by default either.
    const free = this.skills
      .map(s => s.number)
      .filter(n => isHotbarSkill(n) && !used.has(n));
    for (let slot = 1; slot <= 10 && free.length; slot++) {
      const i = slot % 10;
      if (next[i] === -1) next[i] = free.shift()!;
    }
    this.skillHotkeys = next;
  }

  constructor() {
    makeObservable(this, {
      skills: observable,
      buffs: observable,
      currentSkill: observable,
      skillHotkeys: observable,
      applyKeyConfiguration: action,
      setBuff: action,
      setSkillList: action,
      addSkill: action,
      removeSkill: action,
      selectSkill: action,
      assignSkillHotkey: action,
    });
  }
})();
