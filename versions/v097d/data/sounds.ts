/**
 * The sounds 0.97d ships differently from Season 6, by key, as files under
 * `public/game-assets-v097d/`.
 *
 * Its `Sound/` (278 files) and `Music/` (7) were hashed against Season 6's
 * originals: 235 sounds and 6 tracks are byte-identical and play Season 6's
 * converted `.ogg` (borrowed, `index.ts`); the 42 sounds and 1 track below
 * differ and are the period files as shipped (`.wav`, `.mp3`, which the
 * browser decodes as it does `.ogg`). `mGiantWalk.wav` has no key in the
 * catalogue and is not copied.
 */
export const V097D_SOUNDS: Readonly<Record<string, string>> = {
  'Music/MuTheme': 'Music/MuTheme.mp3',
  'Sound/aTower': 'Sound/aTower.wav',
  'Sound/eBlow': 'Sound/eBlow.wav',
  'Sound/eMeteorite': 'Sound/eMeteorite.wav',
  'Sound/ePiercing': 'Sound/ePiercing.wav',
  'Sound/eSwellLife': 'Sound/eSwellLife.wav',
  'Sound/eSwingLightSword': 'Sound/eSwingLightSword.wav',
  'Sound/eSwingWeapon1': 'Sound/eSwingWeapon1.wav',
  'Sound/eSwingWeapon2': 'Sound/eSwingWeapon2.wav',
  'Sound/eThunder': 'Sound/eThunder.wav',
  'Sound/iTitle': 'Sound/iTitle.wav',
  'Sound/mBepar1': 'Sound/mBepar1.wav',
  'Sound/mBepar2': 'Sound/mBepar2.wav',
  'Sound/mBull1': 'Sound/mBull1.wav',
  'Sound/mBull2': 'Sound/mBull2.wav',
  'Sound/mBullDie': 'Sound/mBullDie.wav',
  'Sound/mDrakan1': 'Sound/mDrakan1.wav',
  'Sound/mDrakanAttack1': 'Sound/mDrakanAttack1.wav',
  'Sound/mDrakanDie': 'Sound/mDrakanDie.wav',
  'Sound/mGiantDie': 'Sound/mGiantDie.wav',
  'Sound/mHellSpiderAttack1': 'Sound/mHellSpiderAttack1.wav',
  'Sound/mHound1': 'Sound/mHound1.wav',
  'Sound/mHound2': 'Sound/mHound2.wav',
  'Sound/mHoundAttack1': 'Sound/mHoundAttack1.wav',
  'Sound/mHoundAttack2': 'Sound/mHoundAttack2.wav',
  'Sound/mHoundDie': 'Sound/mHoundDie.wav',
  'Sound/mLarva1': 'Sound/mLarva1.wav',
  'Sound/mLarva2': 'Sound/mLarva2.wav',
  'Sound/mMegaCrust1': 'Sound/mMegaCrust1.wav',
  'Sound/mMegaCrustAttack1': 'Sound/mMegaCrustAttack1.wav',
  'Sound/mMegaCrustDie': 'Sound/mMegaCrustDie.wav',
  'Sound/mOrcArcherAttack1': 'Sound/mOrcArcherAttack1.wav',
  'Sound/mOrcCapAttack1': 'Sound/mOrcCapAttack1.wav',
  'Sound/mPhantom1': 'Sound/mPhantom1.wav',
  'Sound/mPhoenix2': 'Sound/mPhoenix2.wav',
  'Sound/mPhoenixAttack1': 'Sound/mPhoenixAttack1.wav',
  'Sound/mRainnerAttack1': 'Sound/mRainnerAttack1.wav',
  'Sound/pWalk(Grass)': 'Sound/pWalk(Grass).wav',
  'Sound/pWalk(Snow)': 'Sound/pWalk(Snow).wav',
  'Sound/pWalk(Soil)': 'Sound/pWalk(Soil).wav',
  'Sound/sKnightDefense': 'Sound/sKnightDefense.wav',
  'Sound/sKnightSkill2': 'Sound/sKnightSkill2.wav',
  'Sound/sKnightSkill3': 'Sound/sKnightSkill3.wav',
};
