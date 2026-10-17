/** uk text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Гітара',
  'instrument.flute': 'Флейта',
  'instrument.ocarina': 'Окарина',
  'instrument.harp': 'Арфа',
  'instrument.drums': 'Барабани',
  'instrument.you': 'ви',
  'instrument.startsPlaying': 'Гравець {name} починає грати: {instrument}',
  'instrument.stopsPlaying': 'Гравець {name} перестає грати',
  'instrument.joinsBand': 'Гравець {name} приєднується до гурту гравця {master}',
  'instrument.leavesBand': 'Гравець {name} покидає гурт',
  'instrument.fileError': 'Цей файл не є MIDI-файлом, який може відтворити клієнт',
  'instrument.unavailable': 'На цьому сервері інструменти недоступні',
  'instrument.stopped.flood': 'Ваш виступ зупинено: забагато нот одночасно',
  'instrument.stopped.order': 'Ваш виступ зупинено: ноти надійшли не по порядку',
  'instrument.stopped.gone': 'Музикант пішов',
  'instrument.refused.cooldown': 'Знову грати можна через {seconds} с',
  'instrument.refused.busy': 'Ви вже граєте або перебуваєте в гурті',
  'instrument.refused.full': 'Тут зараз забагато музикантів',
  'instrument.refused.range': 'Надто далеко від музиканта',
  'instrument.refused.map': 'Музикант на іншій мапі',
  'instrument.refused.notPerforming': 'Цей гравець не грає',
  'instrument.refused.rate': 'Повільніше',
} satisfies Partial<Record<keyof typeof en, string>>;
