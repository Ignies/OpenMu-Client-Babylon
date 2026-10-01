import { COMBAT_BUS } from '@/controllers/sound/combatSounds';
import { EventBus } from '@/core/eventBus';
import { ShowEffectEffectTypeEnum, ShowEffectPacket, ShowSwirlPacket, WeatherStatusUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { Store } from '@/app/store';
import { UI_BUS, playSfx } from '@/controllers/sound/sfx';
import { WEATHER_RAIN } from '@/controllers/weather/rainState';
import { emitObjectEffect } from '@/app/logic';
import { inChaosCastle } from '@/controllers/actors/locomotion';
import { runInAction } from 'mobx';

/** The "rain, intensity 0" value is logged once per session, not per packet. */
let weatherZeroReported = false;

EventBus.on('WeatherStatusUpdate', packet => {
  const p = new WeatherStatusUpdatePacket(packet);
  const weather = p.Weather;
  const variation = p.Variation;

  // The packet is the only thing that can start rain anywhere but Icarus, and
  // nothing in the client reports when it does not arrive - so a weather
  // change is worth one line. Only on change: the proxy heartbeats.
  if (
    weather !== Store.weather.weather ||
    variation !== Store.weather.variation
  ) {
    if (weather === WEATHER_RAIN && variation === 0) {
      // `RainTarget = (Value & 15) * 6` is zero: the original client simply
      // shows no rain for this value. The proxy never emits it, but OpenMU
      // itself does (kind 1 / variation 0 on map entry), several times a
      // session - treated as clear, said once.
      if (!weatherZeroReported) {
        weatherZeroReported = true;
        console.debug('[weather] rain with intensity 0 received - treated as clear');
      }
    } else {
      console.log(
        `[weather] ${weather === WEATHER_RAIN ? `rain ${variation}/15` : `clear (kind ${weather})`}`
      );
    }
  }

  runInAction(() => {
    Store.weather = { weather, variation };
  });
});

// ReceiveServerCommand (WSclient.cpp:8359-8360): command 2 is SOUND_MEDAL.
const FANFARE_EFFECT = 2;
EventBus.on('fanfare', ({ effectType }) => {
  if (effectType === FANFARE_EFFECT) {
    playSfx('Sound/eMedal', null, { bus: UI_BUS, channels: 1 });
  }
});

// C1 48 - level-up beam, shield potion, shield lost.
EventBus.on('ShowEffect', packet => {
  const p = new ShowEffectPacket(packet);
  const netId = p.PlayerId & 0x7fff;

  switch (p.Effect) {
    case ShowEffectEffectTypeEnum.LevelUp:
      // SOUND_LEVEL_UP rides the burst (objectEffectSystem), the hero's included.
      emitObjectEffect(netId, 'levelUp');
      break;
    case ShowEffectEffectTypeEnum.ShieldPotion:
      emitObjectEffect(netId, 'shieldPotion');
      break;
    case ShowEffectEffectTypeEnum.ShieldLost: {
      emitObjectEffect(netId, 'shieldLost');
      // ReceiveDisplayEffectViewport (WSclient.cpp:9662-9668): SOUND_SHIELDCLASH,
      // except in Chaos Castle.
      const world = Store.world;
      const who = world?.getByNetId(netId);
      if (world && who?.transform && !inChaosCastle(world.mapIndex)) {
        playSfx('Sound/shieldclash', who.transform.pos, { bus: COMBAT_BUS, channels: 1 });
      }
      break;
    }
  }
});

// C1 67 - swirl effect (used e.g. on teleport / certain skills).
EventBus.on('ShowSwirl', packet => {
  const p = new ShowSwirlPacket(packet);
  emitObjectEffect(p.TargetObjectId & 0x7fff, 'swirl');
});
