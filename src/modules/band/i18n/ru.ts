/** Russian text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Гитара',
  'instrument.flute': 'Флейта',
  'instrument.ocarina': 'Окарина',
  'instrument.harp': 'Арфа',
  'instrument.drums': 'Барабаны',
  'instrument.track': 'Дорожка',
  'instrument.notes': 'Ноты',
  'instrument.owner': 'Играет',
  'instrument.you': 'вы',
  'instrument.unassigned': 'никто',
  'instrument.startsPlaying': '{name} начинает играть на {instrument}',
  'instrument.stopsPlaying': '{name} перестаёт играть',
  'instrument.joinsBand': '{name} присоединяется к группе {master}',
  'instrument.leavesBand': '{name} покидает группу',
  'instrument.fileError': 'Этот файл не MIDI, который клиент может воспроизвести',
  'instrument.unavailable': 'Инструменты недоступны на этом сервере',
  'instrument.stopped.flood': 'Ваше выступление остановлено: слишком много нот сразу',
  'instrument.stopped.order': 'Ваше выступление остановлено: ноты пришли не по порядку',
  'instrument.stopped.gone': 'Музыкант ушёл',
  'instrument.refused.cooldown': 'Снова играть можно через {seconds} с',
  'instrument.refused.busy': 'Вы уже играете или состоите в группе',
  'instrument.refused.full': 'Здесь сейчас слишком много музыкантов',
  'instrument.refused.range': 'Слишком далеко от музыканта',
  'instrument.refused.map': 'Музыкант на другой карте',
  'instrument.refused.notPerforming': 'Этот игрок не играет',
  'instrument.refused.rate': 'Помедленнее',
} satisfies Partial<Record<keyof typeof en, string>>;
