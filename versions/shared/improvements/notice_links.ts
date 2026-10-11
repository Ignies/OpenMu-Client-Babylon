import { defineImprovement } from '@/controllers/fidelity';

/**
 * Web addresses in a server notice (`<a href>` or a bare `https://`) are drawn as clickable,
 * underlined links that open a new tab, and a line with one is not cut in two. Classic: the
 * notice is plain text, markup and all (`RenderNotices`, ZzzInterface.cpp:491-603). Read in
 * `modules/chat/notices.ts` (`create`) and `versions/shared/ui/hud/notices/index.tsx`.
 */
export default defineImprovement({
  id: 'noticeLinks',
  preset: 'enhanced',
  labelKey: 'fidelity.noticeLinks',
  hintKey: 'fidelity.noticeLinks.hint',
});
