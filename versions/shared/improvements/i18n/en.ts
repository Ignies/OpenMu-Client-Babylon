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
  'fidelity.openRooms': 'Open rooms',
  'fidelity.openRooms.hint':
    'Inside a room the town stays visible around it instead of going black. Classic: everything outside the room is black.',
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
  'fidelity.loginTokens': 'Saved logins',
  'fidelity.loginTokens.hint':
    'On worlds that offer it, "Remember me" keeps a sign-in token instead of your password, so the next login needs no password. Classic: you type the password every time, as in the original.',
  'fidelity.teleportLandsEarly': 'Teleport lands at once',
  'fidelity.teleportLandsEarly.hint':
    'Your own Teleport lands on the square as soon as you fade out, without waiting for the server to answer. Classic: you stay faded on the old square until the server answers, as in the original.',
  'fidelity.soccerBoardClock':
    'Soccer clock on the board',
  'fidelity.soccerBoardClock.hint':
    'The Battle Soccer time shows as a clock on the scoreboard instead of a line in the middle of the screen. Classic: the remaining time is written in the middle of the screen, as in the original.',
  'fidelity.enhancedSkillEffects': 'Enhanced skill effects',
  'fidelity.enhancedSkillEffects.hint':
    'Some skills draw with our own looks, such as the Evil Spirit swarm with its smoke and shroud. Also the Skill effects option. Classic: every skill draws as in the original.',
  'fidelity.restAnyWall': 'Rest against any wall',
  'fidelity.restAnyWall.hint':
    'Click a straight wall or fence and your hero walks beside it and leans on it, as at the lean spots. Classic: you can only lean at the spots the map places, as in the original.',
  'fidelity.muHelperButtons': 'MU Helper buttons',
  'fidelity.muHelperButtons.hint':
    'Start / Stop and Settings buttons for the MU Helper under the event timers. Classic: only the Home and End keys, as in the original.',
  'fidelity.statCommandNotice': 'Stat command notice',
  'fidelity.statCommandNotice.hint':
    "After /addstr and the other stat commands, the system log says how many points went into which stat. Classic: the server's answer alone, as in the original.",
  'fidelity.loadBarCreep': 'Load bars keep moving',
  'fidelity.loadBarCreep.hint':
    'Loading bars keep creeping forward between reports, so they never stand still while a map builds. Classic: the bar shows how far the load is and waits, as in the original.',
  'fidelity.jewelryUpgrade': 'Jewels on rings and pendants',
  'fidelity.jewelryUpgrade.hint':
    'Bless, Soul and Life can be dropped on the common rings and pendants, on worlds whose server supports it. Classic: rings and pendants refuse them, as in the original.',
  'fidelity.jewelBundling': 'Bundle jewels with a right click',
  'fidelity.jewelBundling.hint':
    'A right click on a jewel in the inventory bundles 10, 20 or 30, and on a bundle unbundles it, without Lahap, on worlds whose server supports it. Classic: jewels are bundled only at Lahap, as in the original.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/improvements': typeof en;
  }
}
