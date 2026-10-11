import { makeObservable, observable } from 'mobx';

/**
 * `WeatherStatusUpdate` (0x0F): the current map's weather kind and variation. The world module
 * writes it; `rainState.ts` reads it. Replaced whole on every packet.
 */
export const WeatherStatus = new (class {
  weather = { weather: 0, variation: 0 };

  constructor() {
    makeObservable(this, { weather: observable });
  }
})();
