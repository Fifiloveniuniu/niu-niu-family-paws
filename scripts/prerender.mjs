import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile } from 'node:fs/promises';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { App } = await server.ssrLoadModule('/apps/web/src/main.tsx');
  const html = await readFile('dist/index.html', 'utf8');
  const markup = renderToString(createElement(App));
  if (!markup.includes('<h1>') || !markup.includes('id="services"')) throw new Error('Public content missing from prerender');
  await writeFile('dist/index.html', html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`));
  console.log('Prerendered public content for search engines and initial loading.');
} finally {
  await server.close();
}
