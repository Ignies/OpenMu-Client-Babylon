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
  'fidelity.openRooms': 'Salas abertas',
  'fidelity.openRooms.hint':
    'Dentro de uma sala a cidade continua visível ao redor em vez de ficar preta. Clássica: tudo fora da sala fica preto.',
  'fidelity.requestTimeout': 'Pedidos expiram após 20 s',
  'fidelity.requestTimeout.hint':
    'Um pedido de troca, grupo ou duelo sem resposta é recusado após 20 segundos. Clássica: espera até você responder.',
  'fidelity.noticeLinks': 'Links nos avisos do servidor',
  'fidelity.noticeLinks.hint':
    'Endereços web nos avisos do servidor viram links sublinhados que abrem outra aba. Clássica: texto simples, como no original.',
  'fidelity.cameraKeepsView': 'Câmera mantida entre mapas',
  'fidelity.cameraKeepsView.hint':
    'O zoom, o giro e a inclinação da câmera continuam iguais quando você se teleporta ou muda de mapa, e um botão Redefinir câmera aparece enquanto a visão estiver movida. Clássica: cada troca de mapa redefine a câmera, como no original.',
  'fidelity.swingFill': 'Golpes preenchem o tempo entre eles',
  'fidelity.swingFill.hint':
    'Com velocidade de ataque alta, a parte do golpe depois do impacto toca mais devagar para durar até o próximo golpe, em vez de o herói ficar parado no meio. Os golpes acertam no mesmo momento. Clássica: o golpe acaba cedo e o herói fica parado, como no original.',
  'fidelity.drawnClothShadows': 'Sombras de tecido organizadas',
  'fidelity.drawnClothShadows.hint':
    'Só as capas, túnicas e cabelos que um personagem mostra projetam sombra. Clássica: um tecido que o personagem já não mostra continua deixando sua sombra onde ficou, como no original.',
  'fidelity.loginTokens': 'Logins salvos',
  'fidelity.loginTokens.hint':
    'Nos mundos que oferecem, "Lembrar de mim" guarda um token de acesso no lugar da sua senha, e o próximo login não pede senha. Clássica: você digita a senha toda vez, como no original.',
  'fidelity.teleportLandsEarly': 'Teleporte chega na hora',
  'fidelity.teleportLandsEarly.hint':
    'Seu próprio Teleporte te coloca na casa assim que você some, sem esperar a resposta do servidor. Clássica: você fica sumido na casa anterior até o servidor responder, como no original.',
  'fidelity.soccerBoardClock':
    'Relógio do futebol no placar',
  'fidelity.soccerBoardClock.hint':
    'O tempo do Battle Soccer aparece como um relógio no placar em vez de uma linha no meio da tela. Clássica: o tempo restante é escrito no meio da tela, como no original.',
  'fidelity.enhancedSkillEffects': 'Efeitos de habilidades melhorados',
  'fidelity.enhancedSkillEffects.hint':
    'Algumas habilidades são desenhadas com nossa própria aparência, como o enxame do Evil Spirit com sua fumaça e sua sombra. Também a opção Efeitos de habilidades. Clássica: cada habilidade é desenhada como no original.',
} satisfies Partial<Record<keyof typeof en, string>>;
