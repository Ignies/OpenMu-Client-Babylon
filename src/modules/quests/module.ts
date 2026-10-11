import { defineModule } from '../module';
import { installNet } from './net';
import { installKillCounters } from './killCounters';
import { installLegacyQuests } from './legacyQuests';
import { installNpcDialogue } from './npcDialogue';
import { installQuestLog } from './questLog';
import { installBalgassEntry } from './balgassEntry';

// Optional: a server may run without quests (readme.md "When it is off"). A packet several entries
// handle runs them in this order (`AvailableQuests`: the dialogue, then the log).
export default defineModule({
  id: 'quests',
  install() {
    installKillCounters();
    installLegacyQuests();
    installNpcDialogue();
    installQuestLog();
    installBalgassEntry();
    installNet();
  },
});
