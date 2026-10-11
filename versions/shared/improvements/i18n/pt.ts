/** Portuguese text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': 'Outros jogadores na própria velocidade',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Os outros jogadores atacam e lançam magias na própria velocidade. Clássica: todos se movem na sua velocidade, como no original.',
  'fidelity.masterBuffCancel': 'Buffs de mestre acabam ao serem cancelados',
  'fidelity.masterBuffCancel.hint':
    'Um buff de mestre ou de Rage Fighter some assim que o servidor o cancela. Clássica: ele fica até o tempo acabar.',
  'fidelity.archangelFeathers': 'Penas dos arcanjos',
  'fidelity.archangelFeathers.hint':
    'Os arcanjos do Blood Castle soltam penas e o brilho no chão é maior. Clássica: o pequeno brilho original, sem penas.',
  'fidelity.loginChandeliers': 'Lustres acesos no login',
  'fidelity.loginChandeliers.hint':
    'Os lustres da tela de login ficam acesos. Clássica: ficam apagados, como no original.',
  'fidelity.torchCrackle': 'Som das tochas',
  'fidelity.torchCrackle.hint':
    'As tochas acesas estalam quando você está perto. Clássica: as tochas são silenciosas.',
  'fidelity.loginWallTorches': 'Tochas de parede acesas no login',
  'fidelity.loginWallTorches.hint':
    'As tochas de parede da tela de login queimam com fogo e iluminam o chão. Clássica: só o brilho delas, como no original.',
  'fidelity.fortressLights': 'Luzes da Fortaleza Imperial',
  'fidelity.fortressLights.hint':
    'As tochas, lustres e braseiros da Fortaleza Imperial iluminam o chão ao redor. Clássica: sem luz, como no original.',
  'fidelity.lampFlares': 'Luzes e brilho de lampiões',
  'fidelity.lampFlares.hint':
    'Os postes, velas, lareiras e braseiros ganham um brilho, as velas ardem e alguns lampiões e fogos iluminam o chão à sua volta. Clássica: só o que o original desenha.',
  'fidelity.roofFade': 'Telhados transparentes',
  'fidelity.roofFade.hint':
    'Os telhados somem enquanto você está embaixo deles, para ver o interior. Clássica: os telhados sempre aparecem.',
  'fidelity.requestTimeout': 'Pedidos expiram após 20 s',
  'fidelity.requestTimeout.hint':
    'Um pedido de troca, grupo ou duelo sem resposta é recusado após 20 segundos. Clássica: espera até você responder.',
  'fidelity.noticeLinks': 'Links nos avisos do servidor',
  'fidelity.noticeLinks.hint':
    'Endereços web nos avisos do servidor viram links sublinhados que abrem outra aba. Clássica: texto simples, como no original.',
  'fidelity.drawnClothShadows': 'Sombras de tecido organizadas',
  'fidelity.drawnClothShadows.hint':
    'Só as capas, túnicas e cabelos que um personagem mostra projetam sombra. Clássica: um tecido que o personagem já não mostra continua deixando sua sombra onde ficou, como no original.',
} satisfies Partial<Record<keyof typeof en, string>>;
