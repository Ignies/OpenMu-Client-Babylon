/** English text of the improvements (the Options window's Fidelity page). See src/i18n/readme.md. */

const en = {
  'fidelity.otherPlayersOwnSpeed': 'Other players at their own speed',
  'fidelity.otherPlayersOwnSpeed.hint':
    'Other players swing and cast at their own attack and magic speed. Classic: everyone moves at your speed, as in the original.',
  'fidelity.masterBuffCancel': 'Master buffs end when cancelled',
  'fidelity.masterBuffCancel.hint':
    'A master or Rage Fighter buff disappears as soon as the server cancels it. Classic: it stays until its timer runs out.',
  'fidelity.archangelFeathers': 'Archangel feathers',
  'fidelity.archangelFeathers.hint':
    'The Blood Castle archangels shed feathers and their glow on the ground is wider. Classic: the small original glow, no feathers.',
  'fidelity.loginChandeliers': 'Lit login chandeliers',
  'fidelity.loginChandeliers.hint':
    'The chandeliers on the login screen burn. Classic: they are cold, as in the original.',
  'fidelity.torchCrackle': 'Torch sounds',
  'fidelity.torchCrackle.hint': 'Burning torches crackle when you are near. Classic: torches are silent.',
  'fidelity.loginWallTorches': 'Burning login wall torches',
  'fidelity.loginWallTorches.hint':
    'The wall torches on the login screen burn with fire and light the floor. Classic: only their flare, as in the original.',
  'fidelity.fortressLights': 'Imperial Fortress lights',
  'fidelity.fortressLights.hint':
    'Wall torches, chandeliers and braziers in the Imperial Fortress light the floor around them. Classic: no light, as in the original.',
  'fidelity.lampFlares': 'Lamp lights and flares',
  'fidelity.lampFlares.hint':
    'Street lamps, candles, hearths and braziers glow with a flare, candles burn, and some lamps and fires light the floor around them. Classic: only what the original draws.',
  'fidelity.roofFade': 'See-through roofs',
  'fidelity.roofFade.hint':
    'Roofs fade away while you stand under them, so you can see inside. Classic: roofs always stay drawn.',
  'fidelity.requestTimeout': 'Requests expire after 20 s',
  'fidelity.requestTimeout.hint':
    'A trade, party or duel request you leave alone is declined after 20 seconds. Classic: it waits until you answer.',
  'fidelity.noticeLinks': 'Links in server notices',
  'fidelity.noticeLinks.hint':
    'Web addresses in the server notices are underlined links that open a new tab. Classic: plain text, as in the original.',
  'fidelity.cameraKeepsView': 'Camera kept across warps',
  'fidelity.cameraKeepsView.hint':
    'Your camera zoom, turn and tilt stay as they are when you warp or change maps, and a Reset camera button shows while the view is moved. Classic: every map change resets the camera, as in the original.',
  'fidelity.swingFill': 'Swings fill the time between hits',
  'fidelity.swingFill.hint':
    'At a high attack speed, the part of your swing after the blow plays slower so it lasts until the next swing, instead of the hero freezing in between. Hits land at the same moment. Classic: the swing ends early and the hero stands still, as in the original.',
  'fidelity.drawnClothShadows': 'Tidy cloth shadows',
  'fidelity.drawnClothShadows.hint':
    'Only the capes, robes and hair a character shows cast a shadow. Classic: a cloth the character no longer shows still lays its shadow where it was left, as in the original.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/improvements': typeof en;
  }
}
