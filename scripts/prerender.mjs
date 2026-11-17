import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const publicPages = [
  ['/home/', 'Home'],
  ['/', 'Home'],
  ['/services/', 'Services'],
  ['/about/', 'About us'],
  ['/faqs/', 'FAQs'],
  ['/cancellation-policy/', 'Cancellation policy'],
  ['/404/', 'Page not found'],
];

function pageTitle(template, title) {
  return template.replace(/<title>.*?<\/title>/, `<title>${title} · Niu Niu Family Paws</title>`);
}

function publicPageHtml(template, routePath, title, markup) {
  const canonicalPath = routePath === '/' ? '/home/' : routePath;
  return pageTitle(template, title)
    .replace('</head>', `<link rel="canonical" href="${canonicalPath}"/></head>`)
    .replace(
      '<div id="root"></div>',
      () => `<div id="root" data-page="${routePath}">${markup}</div>`,
    );
}

async function writePublicPage(App, template, routePath, title) {
  const markup = renderToString(createElement(App, { initialPath: routePath }));
  if (!/<h1(?:\s[^>]*)?>/.test(markup)) throw new Error('Missing public heading: ' + routePath);
  const isNotFound = routePath === '/404/';
  const directory = isNotFound || routePath === '/' ? 'dist' : 'dist' + routePath;
  const destination = isNotFound ? 'dist/404.html' : directory + '/index.html';
  await mkdir(directory, { recursive: true });
  await writeFile(destination, publicPageHtml(template, routePath, title, markup));
}

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
try {
  const { App } = await server.ssrLoadModule('/apps/web/src/main.tsx');
  const template = await readFile('dist/index.html', 'utf8');
  for (const [routePath, title] of publicPages)
    await writePublicPage(App, template, routePath, title);
  await mkdir('dist/app', { recursive: true });
  await writeFile('dist/app/index.html', pageTitle(template, 'App'));
  console.log('Prerendered public pages and generated the application entry.');
} finally {
  await server.close();
}
