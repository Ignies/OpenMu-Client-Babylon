import { defineImprovement } from '@/controllers/fidelity';

/**
 * The Battle Soccer time is a clock line on the scoreboard instead of a line at the screen centre.
 * Classic: F3 22 is drawn at the centre (`RenderTournamentInterface`, ZzzInterface.cpp:3740-3790) and
 * the board has no clock. Read in `ui/hud/soccer_score` and `ui/hud/match_time`.
 */
export default defineImprovement({
  id: 'soccerBoardClock',
  preset: 'enhanced',
  labelKey: 'fidelity.soccerBoardClock',
  hintKey: 'fidelity.soccerBoardClock.hint',
});
