/** Korean text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': '다른 플레이어는 자기 속도로',
  'fidelity.otherPlayersOwnSpeed.hint':
    '다른 플레이어가 자신의 공격 속도와 마법 속도로 공격하고 시전합니다. 클래식: 원작처럼 모두가 내 속도로 움직입니다.',
  'fidelity.masterBuffCancel': '마스터 버프는 취소 시 사라짐',
  'fidelity.masterBuffCancel.hint':
    '마스터나 레이지파이터 버프가 서버에서 취소되는 즉시 사라집니다. 클래식: 시간이 다 될 때까지 남아 있습니다.',
  'fidelity.archangelFeathers': '대천사의 깃털',
  'fidelity.archangelFeathers.hint':
    '블러드 캐슬의 대천사가 깃털을 흩날리고 바닥의 빛이 더 넓어집니다. 클래식: 원작의 작은 빛만 있고 깃털은 없습니다.',
  'fidelity.loginChandeliers': '로그인 화면 샹들리에 점등',
  'fidelity.loginChandeliers.hint':
    '로그인 화면의 샹들리에에 불이 켜집니다. 클래식: 원작처럼 꺼져 있습니다.',
  'fidelity.torchCrackle': '횃불 소리',
  'fidelity.torchCrackle.hint':
    '가까이 있는 횃불이 타닥거립니다. 클래식: 횃불은 소리가 없습니다.',
  'fidelity.loginWallTorches': '로그인 화면 벽 횃불 점등',
  'fidelity.loginWallTorches.hint':
    '로그인 화면의 벽 횃불이 불타며 바닥을 비춥니다. 클래식: 원작처럼 빛 번짐만 있습니다.',
  'fidelity.fortressLights': '제국 요새의 불빛',
  'fidelity.fortressLights.hint':
    '제국 요새의 벽 횃불, 샹들리에, 화로가 주변 바닥을 비춥니다. 클래식: 원작처럼 불빛이 없습니다.',
  'fidelity.lampFlares': '등불의 빛과 빛 번짐',
  'fidelity.lampFlares.hint':
    '가로등, 촛불, 화덕, 화로에 빛 번짐이 생기고, 촛불이 타오르며, 일부 등불과 불이 주변 바닥을 밝힙니다. 클래식: 원작이 그리는 것만 보입니다.',
  'fidelity.roofFade': '투명해지는 지붕',
  'fidelity.roofFade.hint':
    '지붕 아래에 서 있으면 지붕이 사라져 안이 보입니다. 클래식: 지붕은 항상 보입니다.',
  'fidelity.requestTimeout': '요청은 20초 후 만료',
  'fidelity.requestTimeout.hint':
    '응답하지 않은 거래, 파티, 결투 요청은 20초 후 거절됩니다. 클래식: 응답할 때까지 기다립니다.',
  'fidelity.noticeLinks': '서버 공지의 링크',
  'fidelity.noticeLinks.hint':
    '서버 공지의 웹 주소가 밑줄 친 링크가 되어 새 탭에서 열립니다. 클래식: 원본처럼 일반 텍스트.',
  'fidelity.drawnClothShadows': '깔끔한 천 그림자',
  'fidelity.drawnClothShadows.hint':
    '캐릭터가 보여 주는 망토, 로브, 머리카락만 그림자를 드리웁니다. 클래식: 더 이상 보이지 않는 천도 남겨진 자리에 그림자를 계속 드리웁니다(원작과 같음).',
} satisfies Partial<Record<keyof typeof en, string>>;
