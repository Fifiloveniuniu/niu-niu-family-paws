import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {App}=await server.ssrLoadModule('/apps/web/src/main.tsx');
 const template=await readFile('dist/index.html','utf8');
 const pages=[['/home/','Home'],['/','Home'],['/services/','Services'],['/about/','About us'],['/faqs/','FAQs'],['/cancellation-policy/','Cancellation policy'],['/404/','Page not found']];
 for(const [path,title] of pages){const markup=renderToString(createElement(App,{initialPath:path}));if(!markup.includes('<h1>'))throw new Error('Missing public heading: '+path);const folder=path==='/404/'?'dist':path==='/'?'dist':'dist'+path;await mkdir(folder,{recursive:true});const html=template.replace('</head>',`<link rel="canonical" href="${path==='/'?'/home/':path}"/></head>`).replace(/<title>.*?<\/title>/,'<title>'+title+' · Niu Niu Family Paws</title>').replace('<div id="root"></div>',()=>`<div id="root" data-page="${path}">${markup}</div>`);await writeFile(path==='/404/'?'dist/404.html':folder+'/index.html',html);}
 await mkdir('dist/app',{recursive:true});await writeFile('dist/app/index.html',template.replace(/<title>.*?<\/title>/,'<title>App · Niu Niu Family Paws</title>'));
 console.log('Prerendered public pages and generated the application entry.');
}finally{await server.close();}
