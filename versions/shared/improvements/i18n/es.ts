/** Spanish text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Otros jugadores a su propia velocidad',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Los demás jugadores atacan y lanzan magia a su propia velocidad. Clásica: todos se mueven a tu velocidad, como en el original.',
  'fidelity.masterBuffCancel': 'Los buffs de maestro terminan al cancelarse',
  'fidelity.masterBuffCancel.hint':
    'Un buff de maestro o de Rage Fighter desaparece en cuanto el servidor lo cancela. Clásica: dura hasta que acaba su tiempo.',
  'fidelity.archangelFeathers': 'Plumas de los arcángeles',
  'fidelity.archangelFeathers.hint':
    'Los arcángeles de Blood Castle sueltan plumas y su brillo en el suelo es más amplio. Clásica: el brillo pequeño original, sin plumas.',
  'fidelity.loginChandeliers': 'Candelabros encendidos en el inicio',
  'fidelity.loginChandeliers.hint':
    'Los candelabros de la pantalla de inicio de sesión arden. Clásica: están apagados, como en el original.',
  'fidelity.wingShadows': 'Sombras de las alas',
  'fidelity.wingShadows.hint':
    'Las alas proyectan sombra. Clásica: sin sombra, como en el original.',
  'fidelity.torchCrackle': 'Sonido de antorchas',
  'fidelity.torchCrackle.hint':
    'Las antorchas encendidas crepitan cuando estás cerca. Clásica: las antorchas no suenan.',
  'fidelity.loginWallTorches': 'Antorchas de pared encendidas en el inicio',
  'fidelity.loginWallTorches.hint':
    'Las antorchas de la pantalla de inicio de sesión arden con fuego e iluminan el suelo. Clásica: solo su destello, como en el original.',
  'fidelity.fortressLights': 'Luces de la Fortaleza Imperial',
  'fidelity.fortressLights.hint':
    'Las antorchas y candelabros de la Fortaleza Imperial iluminan el suelo a su alrededor. Clásica: sin luz, como en el original.',
} satisfies Partial<Record<keyof typeof en, string>>;
