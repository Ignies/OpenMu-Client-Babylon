import { lazy, Suspense } from 'react';
import { defineWindow } from '@/controllers/interface/windows';
import { loadVersionUi } from '@/version';

// Each version ships its own master tree window (or none): loaded on first draw.
const VersionMasterSkills = lazy(async () => ({ default: (await loadVersionUi()).MasterSkillsWindow }));

export default defineWindow({
  id: 'master_skills',
  slot: 'hud',
  order: 290,
  component: () => (
    <Suspense fallback={null}>
      <VersionMasterSkills />
    </Suspense>
  ),
});
