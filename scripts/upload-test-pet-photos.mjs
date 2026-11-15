// Test-only library; fixed development bucket, no customer records or IAM changes.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const args=process.argv.slice(2),input=args.find(arg=>!arg.startsWith('--'));
if(!input || args.some(arg=>arg.startsWith('--')&&!['--upload','--prepare'].includes(arg)) || args.includes('--upload')===args.includes('--prepare'))throw new Error('Usage: node scripts/upload-test-pet-photos.mjs <asset-directory> --prepare|--upload');
const root=path.resolve(input),bucket='niu-niu-family-paws-dev-pet-photos',prefix='test-library/v1';
const digest=(data,algorithm='sha256',encoding='hex')=>createHash(algorithm).update(data).digest(encoding);
let entries=JSON.parse(await readFile(path.join(root,'sources.json'),'utf8'));
if(!entries.length || entries.some(e=>!['cat','dog','rabbit'].includes(e.species)||e.testOnly!==true||!e.licenseUrl||!e.sourcePage))throw new Error('Invalid source manifest');
if(args.includes('--prepare')){
  await mkdir(path.join(root,'prepared'),{recursive:true});
  for(const entry of entries){
    const source=path.resolve(root,entry.localFile);
    if(!source.startsWith(root+path.sep))throw new Error('Source path outside asset directory');
    const bytes=await readFile(source);
    if(digest(bytes)!==entry.sourceSha256)throw new Error('Source checksum mismatch');
    const image=await sharp(bytes,{limitInputPixels:20_000_000}).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
    entry.sha256=digest(image);entry.md5=digest(image,'md5','base64');entry.bytes=image.length;
    entry.object=`${prefix}/${entry.species}/${entry.sha256}.webp`;
    entry.storageUri=`gs://${bucket}/${entry.object}`;
    entry.transformation='Resized within 640 × 640; reencoded as WebP; source metadata removed. Adaptation retains the stated source license.';
    await writeFile(path.join(root,'prepared',entry.sha256+'.webp'),image);
  }
  if(new Set(entries.map(e=>e.sha256)).size!==entries.length)throw new Error('Duplicate image bytes');
  await writeFile(path.join(root,'manifest.json'),JSON.stringify({testOnly:true,bucket,prefix,entries:entries.map(({localFile,...entry})=>entry)},null,2)+'\n');
  for(const species of ['cat','dog','rabbit']){
    const subset=entries.filter(e=>e.species===species),width=1400,tileW=140,tileH=160;
    const composite=[];
    for(let i=0;i<subset.length;i++){
      const entry=subset[i],image=await sharp(path.join(root,'prepared',entry.sha256+'.webp')).resize(134,134,{fit:'contain',background:'#fff'}).png().toBuffer();
      const x=(i%10)*tileW,y=Math.floor(i/10)*tileH;
      composite.push({input:image,left:x,top:y});
      composite.push({input:Buffer.from(`<svg width="140" height="24"><text x="4" y="17" font-size="13">${i+1}: ${entry.pageId}</text></svg>`),left:x,top:y+134});
    }
    await sharp({create:{width,height:Math.ceil(subset.length/10)*tileH,channels:3,background:'#fff'}}).composite(composite).png().toFile(path.join(root,`${species}-contact-sheet.png`));
  }
  console.log(JSON.stringify({prepared:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),counts:Object.fromEntries(['cat','dog','rabbit'].map(s=>[s,entries.filter(e=>e.species===s).length]))}));
}else{
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
  entries=manifest.entries;
  if(manifest.bucket!==bucket||manifest.prefix!==prefix)throw new Error('Development destination required');
  const auth=require('firebase-tools/lib/auth'),account=auth.getGlobalDefaultAccount();
  if(!account)throw new Error('Existing Firebase CLI login required');
  const {access_token:token}=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  async function request(url,options={}){
    const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});
    if(!response.ok&&response.status!==412)throw new Error(`Storage request failed (${response.status})`);
    return response;
  }
  const metadata=await(await request(`https://storage.googleapis.com/storage/v1/b/${bucket}`)).json();
  if(metadata.location!=='US-WEST1'||metadata.iamConfiguration?.publicAccessPrevention!=='enforced'||!metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled)throw new Error('Expected private Oregon development bucket');
  async function upload(object,bytes,type){
    if(!object.startsWith(prefix+'/')||object.includes('..'))throw new Error('Test prefix required');
    const expected=digest(bytes,'md5','base64');
    await request(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(object)}`,{method:'POST',headers:{'Content-Type':type,'Cache-Control':'private, no-store'},body:bytes});
    const stored=await(await request(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}`)).json();
    if(stored.md5Hash!==expected||Number(stored.size)!==bytes.length)throw new Error('Remote checksum mismatch');
    return stored.generation;
  }
  let next=0,verified=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<entries.length){
      const entry=entries[next++];
      if(!/^[a-f0-9]{64}$/.test(entry.sha256)||!['cat','dog','rabbit'].includes(entry.species)||entry.object!==`${prefix}/${entry.species}/${entry.sha256}.webp`||entry.testOnly!==true)throw new Error('Invalid test asset path');
      const bytes=await readFile(path.join(root,'prepared',entry.sha256+'.webp'));
      if(digest(bytes)!==entry.sha256)throw new Error('Prepared checksum mismatch');
      entry.generation=await upload(entry.object,bytes,'image/webp');verified++;
      if(verified%25===0)console.log(`${verified}/${entries.length} uploaded and verified`);
    }
  }));
  const result={...manifest,entries,uploadedAt:new Date().toISOString()};
  const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n'),object=`${prefix}/manifests/${digest(bytes)}.json`;
  await upload(object,bytes,'application/json');
  result.manifestStorageUri=`gs://${bucket}/${object}`;
  await writeFile(path.join(root,'uploaded-manifest.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({verified,bucket,manifestStorageUri:result.manifestStorageUri}));
}
