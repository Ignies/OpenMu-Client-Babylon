import type { MapLayer } from './layer';
import { lorenciaLayer } from './lorencia';
import { dungeonLayer } from './dungeon';
import { deviasLayer } from './devias';
import { noriaLayer } from './noria';
import { losttowerLayer } from './losttower';
import { stadiumLayer } from './stadium';
import { atlansLayer } from './atlans';
import { tarkanLayer } from './tarkan';
import { devilsquareLayer } from './devilsquare';
import { icarusLayer } from './icarus';
import { bloodcastleLayer } from './bloodcastle';
import { chaoscastleLayer } from './chaoscastle';
import { kalimaLayer } from './kalima';
import { valleyoflorenLayer } from './valleyofloren';
import { landoftrialsLayer } from './landoftrials';
import { aidaLayer } from './aida';
import { crywolfLayer } from './crywolf';
import { kanturu1Layer } from './kanturu1';
import { kanturu2Layer } from './kanturu2';
import { kanturu3Layer } from './kanturu3';
import { gmareaLayer } from './gmarea';
import { balgasbarracksLayer } from './balgasbarracks';
import { balgasrefugeLayer } from './balgasrefuge';
import { cursedtempleLayer } from './cursedtemple';
import { elbelandLayer } from './elbeland';
import { swampLayer } from './swamp';
import { raklionLayer } from './raklion';
import { raklionbossLayer } from './raklionboss';
import { santatownLayer } from './santatown';
import { vulcanusLayer } from './vulcanus';
import { duelarenaLayer } from './duelarena';
import { doppelganger1Layer } from './doppelganger1';
import { doppelganger2Layer } from './doppelganger2';
import { doppelganger3Layer } from './doppelganger3';
import { doppelganger4Layer } from './doppelganger4';
import { empireguardianLayer } from './empireguardian';
import { empireguardian4Layer } from './empireguardian4';
import { loginsceneLayer } from './loginscene';
import { lorenmarketLayer } from './lorenmarket';
import { karutan1Layer } from './karutan1';
import { karutan2Layer } from './karutan2';

/**
 * Every map the client can load. The only place maps are enumerated: no
 * `switch (map)` anywhere else. Order is `ENUM_WORLD` order; nothing here
 * reads another entry, so order carries no meaning beyond listing.
 */
export const MAP_LAYERS: readonly MapLayer[] = [
  lorenciaLayer,
  dungeonLayer,
  deviasLayer,
  noriaLayer,
  losttowerLayer,
  stadiumLayer,
  atlansLayer,
  tarkanLayer,
  devilsquareLayer,
  icarusLayer,
  bloodcastleLayer,
  chaoscastleLayer,
  kalimaLayer,
  valleyoflorenLayer,
  landoftrialsLayer,
  aidaLayer,
  crywolfLayer,
  kanturu1Layer,
  kanturu2Layer,
  kanturu3Layer,
  gmareaLayer,
  balgasbarracksLayer,
  balgasrefugeLayer,
  cursedtempleLayer,
  elbelandLayer,
  swampLayer,
  raklionLayer,
  raklionbossLayer,
  santatownLayer,
  vulcanusLayer,
  duelarenaLayer,
  doppelganger1Layer,
  doppelganger2Layer,
  doppelganger3Layer,
  doppelganger4Layer,
  empireguardianLayer,
  empireguardian4Layer,
  loginsceneLayer,
  lorenmarketLayer,
  karutan1Layer,
  karutan2Layer,
];
