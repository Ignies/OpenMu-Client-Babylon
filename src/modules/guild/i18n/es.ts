/** Spanish text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} ha dejado el guild.',
  'guild.youLeft': 'Has dejado el guild.',
  'guild.disbanded': 'El guild ha sido disuelto.',
  'guild.memberRemoved': 'El miembro fue expulsado del guild.',
  'guild.onlyMasterRemoves':
    'Solo el máster del guild puede expulsar miembros.',
  'guild.wrongPassword': 'La contraseña que has puesto no es correcta.',
  'guild.created': 'El guild ha sido creado.',
  'guild.nameTaken': 'Ese nombre de guild ya está en uso.',
  'guild.createFailed': 'No se pudo crear el guild.',
  'guild.joinRefused': 'El máster del guild ha rechazado tu solicitud.',
  'guild.joined': 'Te has unido al guild.',
  'guild.isFull': 'El guild está lleno.',
  'guild.masterUnavailable': 'El máster del guild no está disponible.',
  'guild.masterBusy':
    'El máster del guild está ocupado. Inténtalo más tarde.',
  'guild.needLevel6': 'Necesitas al menos nivel 6 para unirte a un guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
