// Mounts the landing's own components into the site: the map tour with the credits behind every page
// (#mu-backdrop) and the lit logo in the hero (#mu-logo). The PHP layout prints the mount points.
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import '@versions/shared/ui/pages/preloader/style.less';
import { Backdrop } from '@versions/shared/ui/pages/preloader/backdrop';
import { LogoLight } from '@versions/shared/ui/pages/preloader/logoLight';

const mount = (id: string, node: ReactNode) => {
  const el = document.getElementById(id);
  if (el) createRoot(el).render(<div className="ws-page is-loaded is-open">{node}</div>);
};

mount('mu-backdrop', <Backdrop />);
mount('mu-logo', <LogoLight />);
