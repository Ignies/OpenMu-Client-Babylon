// The example streamed module (docs/module_streaming.md): a window with a line of text, and a packet
// echo through 0xE8 when the world has a module plugin that answers "example". Built by build.ts.
import type { ModuleApi } from '../../../src/modules/_api/contract';
import { defineStreamedModule } from '../../../src/modules/_api/streamed';

const LINE = 'Hello from a streamed module';

export default defineStreamedModule({
  api: '^1.1',
  async install(api, where) {
    await api.registerText('en', { 'example.title': 'Example' });
    // In the page the window draws this component (a string is a React node); in the frame the frame is the window.
    const win = { id: 'main', title: 'example.title' };
    if (where === 'page') await (api as ModuleApi<() => string>).registerWindow({ ...win, draw: () => LINE });
    else await api.registerWindow(win);
    const line = where === 'frame' && typeof document !== 'undefined' ? document.body.appendChild(document.createElement('p')) : null;
    if (line) {
      line.style.cssText = 'margin:0;color:#e0d8c0;font:12px sans-serif;text-align:center';
      line.textContent = LINE;
    }
    api.onPacket(payload => {
      void api.playSound('Sound/iButtonClick');
      if (line) line.textContent = `Echo: ${new TextDecoder().decode(payload)}`;
    });
    await api.sendPacket(new TextEncoder().encode('hello'));
  },
});
