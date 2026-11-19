import { initializeAppearance } from './theme-preferences';
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './main';
import { canonicalUrl } from './routing';
initializeAppearance();
const canonical = canonicalUrl(location.href);
if (canonical !== location.pathname + location.search + location.hash)
  history.replaceState(history.state, '', canonical);
const root = document.getElementById('root')!;
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
if (root.hasChildNodes() && root.dataset.page === location.pathname) hydrateRoot(root, app);
else {
  root.replaceChildren();
  createRoot(root).render(app);
}
