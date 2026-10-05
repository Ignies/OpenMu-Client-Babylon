/** Russian text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Другие игроки в своём темпе',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Другие игроки бьют и колдуют со своей скоростью атаки и магии. Классика: все двигаются в вашем темпе, как в оригинале.',
  'fidelity.masterBuffCancel': 'Мастер-баффы снимаются при отмене',
  'fidelity.masterBuffCancel.hint':
    'Мастер-бафф или бафф Rage Fighter исчезает, как только сервер его отменяет. Классика: он держится до конца таймера.',
  'fidelity.archangelFeathers': 'Перья архангелов',
  'fidelity.archangelFeathers.hint':
    'Архангелы в Blood Castle роняют перья, а их свечение на земле шире. Классика: небольшое оригинальное свечение, без перьев.',
  'fidelity.loginChandeliers': 'Горящие люстры при входе',
  'fidelity.loginChandeliers.hint':
    'Люстры на экране входа горят. Классика: они потушены, как в оригинале.',
  'fidelity.wingShadows': 'Тени крыльев',
  'fidelity.wingShadows.hint':
    'Крылья отбрасывают тень. Классика: без тени, как в оригинале.',
  'fidelity.torchCrackle': 'Звук факелов',
  'fidelity.torchCrackle.hint':
    'Горящие факелы потрескивают, когда вы рядом. Классика: факелы беззвучны.',
  'fidelity.loginWallTorches': 'Горящие настенные факелы при входе',
  'fidelity.loginWallTorches.hint':
    'Настенные факелы на экране входа горят огнём и освещают пол. Классика: только их отблеск, как в оригинале.',
  'fidelity.fortressLights': 'Огни Имперской крепости',
  'fidelity.fortressLights.hint':
    'Факелы, люстры и жаровни Имперской крепости освещают пол вокруг себя. Классика: без света, как в оригинале.',
  'fidelity.lampFlares': 'Свет и отблеск ламп',
  'fidelity.lampFlares.hint':
    'Уличные фонари, свечи, очаги и жаровни светятся отблеском, свечи горят, а некоторые лампы освещают пол вокруг себя. Классика: только то, что рисует оригинал.',
  'fidelity.roofFade': 'Прозрачные крыши',
  'fidelity.roofFade.hint':
    'Крыши исчезают, пока вы стоите под ними, чтобы было видно внутри. Классика: крыши видны всегда.',
} satisfies Partial<Record<keyof typeof en, string>>;
