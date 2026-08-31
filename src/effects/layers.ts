import { spriteLayer } from './sprite';
import { particlesLayer } from './particles';
import { projectileLayer } from './projectile';
import { debrisLayer } from './debris';
import { modelLayer } from './model';
import { columnLayer } from './column';
import { jointLayer } from './joint';
import { blurLayer } from './blur';
import { ringLayer } from './ring';
import { auraLayer } from './aura';
import { burstsLayer } from './bursts';
import { itemAuraLayer } from './itemAura';
import { itemCrackleLayer } from './itemCrackle';
import { itemSparkleLayer } from './itemSparkle';

/**
 * THE list. Every visual effect entry in the game is one line here, and
 * adding an entry is adding one line. Nothing else in the codebase
 * enumerates them; `effects.spawn(name, …)` is typed from this tuple.
 *
 * Order is update order: a projectile moves its point before the model and
 * the particles riding it read it, so `projectile` comes first.
 */
export const EFFECT_LAYERS = [
  projectileLayer, // moves the point the model / trail below follow
  debrisLayer, // moves the pieces the models below follow
  modelLayer, // reads projectile's / debris' points
  spriteLayer,
  particlesLayer,
  columnLayer,
  auraLayer, // drives the heads of the orbit ribbons it spawned through joint, so before it
  jointLayer, // reads aura's ribbon heads
  blurLayer,
  ringLayer,
  burstsLayer, // spawn only; the shared particle pool steps it
  itemAuraLayer, // reset only; itemGlowSystem drives it
  itemCrackleLayer, // reset only; itemGlowSystem drives it
  itemSparkleLayer, // counters only; the shared particle pool draws the glints
] as const;
