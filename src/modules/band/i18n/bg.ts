/** Bulgarian text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Китара',
  'instrument.flute': 'Флейта',
  'instrument.ocarina': 'Окарина',
  'instrument.harp': 'Арфа',
  'instrument.drums': 'Барабани',
  'instrument.track': 'Пътека',
  'instrument.notes': 'Ноти',
  'instrument.owner': 'Свири',
  'instrument.you': 'ти',
  'instrument.unassigned': 'никой',
  'instrument.startsPlaying': '{name} започва да свири на {instrument}',
  'instrument.stopsPlaying': '{name} спира да свири',
  'instrument.joinsBand': '{name} се присъединява към групата на {master}',
  'instrument.leavesBand': '{name} напуска групата',
  'instrument.fileError': 'Този файл не е MIDI файл, който клиентът може да свири',
  'instrument.unavailable': 'Инструментите не са налични на този сървър',
  'instrument.stopped.flood': 'Изпълнението ти беше спряно: твърде много ноти наведнъж',
  'instrument.stopped.order': 'Изпълнението ти беше спряно: нотите пристигнаха в грешен ред',
  'instrument.stopped.gone': 'Изпълнителят го няма',
  'instrument.refused.cooldown': 'Можеш да свириш отново след {seconds} с',
  'instrument.refused.busy': 'Вече свириш или си в група',
  'instrument.refused.full': 'Твърде много изпълнители тук в момента',
  'instrument.refused.range': 'Твърде далеч от изпълнителя',
  'instrument.refused.map': 'Изпълнителят е на друга карта',
  'instrument.refused.notPerforming': 'Този играч не свири',
  'instrument.refused.rate': 'По-бавно',
} satisfies Partial<Record<keyof typeof en, string>>;
