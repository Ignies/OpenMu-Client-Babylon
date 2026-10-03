/** French text of the `band` module. */

import type en from './en';

export default {
  'instrument.guitar': 'Guitare',
  'instrument.flute': 'Flûte',
  'instrument.ocarina': 'Ocarina',
  'instrument.harp': 'Harpe',
  'instrument.drums': 'Batterie',
  'instrument.track': 'Piste',
  'instrument.notes': 'Notes',
  'instrument.owner': 'Joué par',
  'instrument.you': 'vous',
  'instrument.unassigned': 'personne',
  'instrument.startsPlaying': '{name} se met à jouer de la {instrument}',
  'instrument.stopsPlaying': '{name} arrête de jouer',
  'instrument.joinsBand': '{name} rejoint le groupe de {master}',
  'instrument.leavesBand': '{name} quitte le groupe',
  'instrument.fileError': 'Ce fichier n\'est pas un MIDI que ce client peut jouer',
  'instrument.unavailable': 'Les instruments ne sont pas disponibles sur ce serveur',
  'instrument.stopped.flood': 'Votre prestation a été arrêtée : trop de notes à la fois',
  'instrument.stopped.order': 'Votre prestation a été arrêtée : les notes sont arrivées dans le désordre',
  'instrument.stopped.gone': 'Le musicien est parti',
  'instrument.refused.cooldown': 'Vous pourrez rejouer dans {seconds} s',
  'instrument.refused.busy': 'Vous jouez déjà ou faites partie d\'un groupe',
  'instrument.refused.full': 'Trop de musiciens ici pour le moment',
  'instrument.refused.range': 'Trop loin du musicien',
  'instrument.refused.map': 'Le musicien est sur une autre carte',
  'instrument.refused.notPerforming': 'Ce joueur ne joue pas',
  'instrument.refused.rate': 'Ralentissez',
} satisfies Partial<Record<keyof typeof en, string>>;
