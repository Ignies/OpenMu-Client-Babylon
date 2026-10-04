import { COMBAT_BUS } from '@/controllers/sound/combatSounds';
import { EventBus } from '@/core/eventBus';
import { PlayFanfareSoundPacket, ServerCommandPacket, ShowChristmasFireworksPacket, ShowEffectEffectTypeEnum, ShowEffectPacket, ShowFireworksPacket, ShowSwirlPacket, WeatherStatusUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { SWIRL_BLOOM, SWIRL_BLOOM_SECONDS, SWIRL_START } from '@/controllers/sound/packetSounds';
import { SoundsManager } from '@/controllers/sound/soundsManager';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { delay } from '@/controllers/fx/core';
import { events } from '../events';
import { spawnFireworks } from '@/controllers/fx/fireworks';
import { WeatherStatus } from '@/controllers/weather';
import { Ecs } from '@/ecs/current';
import { UI_BUS, playSfx } from '@/controllers/sound/sfx';
import { WEATHER_RAIN } from '@/controllers/weather/rainState';
import { emitObjectEffect } from '../_shared/net_helpers';
import { inChaosCastle } from '@/controllers/actors/locomotion';
import { runInAction } from 'mobx';

/** The "rain, intensity 0" value is logged once per session, not per packet. */
let weatherZeroReported = false;

// ReceiveServerCommand (WSclient.cpp:8359-8360): command 2 is SOUND_MEDAL.
const FANFARE_EFFECT = 2;

// F3/0x40 (length 7) is shared by PlayFanfareSound (EffectType 2), ShowSwirl
// (58), ShowFireworks (0), ShowChristmasFireworks (59) and ServerCommand; the
// dispatcher emits whichever it finds first (ServerCommand today), so every
// name routes here on byte 4.
/** `ReceiveServerCommand` case 1: `CreateOkMessageBox(GlobalText[...])`. */
const SERVER_MESSAGE_BOX = 1;

function routeServerCommand(packet: DataView) {
  const effectType = packet.getUint8(4);
  switch (effectType) {
    case 58: {
      const swirl = new ShowSwirlPacket(packet);
      const netId = swirl.TargetObjectId & 0x7fff;
      emitObjectEffect(netId, 'swirl');
      playSwirlSounds(netId);
      return;
    }
    case 2: {
      const p = new PlayFanfareSoundPacket(packet);
      EventBus.emit('fanfare', { effectType: p.EffectType, x: p.X, y: p.Y });
      return;
    }
    case 0: {
      const p = new ShowFireworksPacket(packet);
      spawnFireworksAt(p.X, p.Y, false);
      return;
    }
    case 59: {
      const p = new ShowChristmasFireworksPacket(packet);
      spawnFireworksAt(p.X, p.Y, true);
      return;
    }
    default: {
      // The other command types open GlobalText message boxes the client has
      // no texts for (ReceiveServerCommand, WSclient.cpp:7744) - but for the
      // numbered boxes (type 1) an event has the text of.
      const p = new ServerCommandPacket(packet);
      if (p.CommandType === SERVER_MESSAGE_BOX && events.serverMessageBox(p.Parameter1)) return;
      console.warn(
        `unhandled ServerCommand ${p.CommandType} (${p.Parameter1}, ${p.Parameter2})`
      );
      return;
    }
  }
}

/** ShowFireworks / ShowChristmasFireworks: the burst at the given tile. */
function spawnFireworksAt(x: number, y: number, christmas: boolean) {
  const world = Ecs.world;
  if (!world) return;
  const at = new Vector3(x, world.getTerrainHeight(x, y), y);
  spawnFireworks(world.scene, at, christmas);
}

/** Server command 58's cherry-blossom sound, then the blooms its effect replays while the target stays. */
function playSwirlSounds(netId: number) {
  const world = Ecs.world;
  const target = world?.getByNetId(netId);
  if (!world || !target) return;
  playSfx(SWIRL_START.key, target.transform.pos, SWIRL_START.opts);
  const bloom = () => {
    if (world.getByNetId(netId) !== target || target.objOutOfScope) return;
    // StopBuffer before each replay (MoveHandlers.cpp:7519): one bloom at a time.
    SoundsManager.stopSoundEffect(SWIRL_BLOOM.key);
    playSfx(SWIRL_BLOOM.key, target.transform.pos, SWIRL_BLOOM.opts);
  };
  for (const seconds of SWIRL_BLOOM_SECONDS) delay(seconds, bloom);
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('WeatherStatusUpdate', packet => {
    const p = new WeatherStatusUpdatePacket(packet);
    const weather = p.Weather;
    const variation = p.Variation;

    // The packet is the only thing that can start rain anywhere but Icarus, and
    // nothing in the client reports when it does not arrive - so a weather
    // change is worth one line. Only on change: the proxy heartbeats.
    if (
      weather !== WeatherStatus.weather.weather ||
      variation !== WeatherStatus.weather.variation
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
      WeatherStatus.weather = { weather, variation };
    });
  });

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
        const world = Ecs.world;
        const who = world?.getByNetId(netId);
        if (world && who?.transform && !inChaosCastle(world.mapIndex)) {
          playSfx('Sound/shieldclash', who.transform.pos, { bus: COMBAT_BUS, channels: 1 });
        }
        break;
      }
    }
  });

  for (const name of ['ServerCommand', 'ShowSwirl', 'ShowFireworks', 'ShowChristmasFireworks', 'PlayFanfareSound'] as const) {
    EventBus.on(name, routeServerCommand);
  }
}
