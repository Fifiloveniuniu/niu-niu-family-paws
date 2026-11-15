import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile } from 'node:fs/promises';

const mode = process.argv[2] || 'production';
const output = mode === 'staging' ? 'dist-dev/index.html' : 'dist/index.html';
const server = await createServer({ mode, server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { App } = await server.ssrLoadModule('/apps/web/src/main.tsx');
  const html = await readFile(output, 'utf8');
  const markup = renderToString(createElement(App));
  if (mode === 'staging' && !markup.includes('TEST ENVIRONMENT')) throw new Error('Staging banner missing');
  if (!markup.includes('<h1>') || !markup.includes('id="services"')) throw new Error('Public content missing from prerender');
  await writeFile(output, html.replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`));
  console.log('Prerendered public content for search engines and initial loading.');
} finally {
  await server.close();
}
