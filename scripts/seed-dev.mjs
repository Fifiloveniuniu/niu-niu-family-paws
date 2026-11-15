// Add-only, repeatable synthetic fixtures. No production target or deletion option.
import {createRequire} from 'node:module';
import {Firestore} from '@google-cloud/firestore';
import {firestoreStore} from '../apps/api/src/store.ts';
import {petStore} from '../apps/api/src/pets.ts';
const projectId='niu-niu-family-paws';
const databaseId='development';
if (process.argv.length > 2 || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('This command only seeds the hosted development database');
const require=createRequire(import.meta.url);
const cliAuth=require('firebase-tools/lib/auth');
// Match the Firestore SDK's auth-library version (Headers API differs by major).
const {OAuth2Client}=createRequire(require.resolve('@google-cloud/firestore'))('google-auth-library');
const account=cliAuth.getGlobalDefaultAccount();
if (!account) throw new Error('Firebase CLI sign-in required');
const token=await cliAuth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
const authClient=new OAuth2Client();
authClient.setCredentials({access_token:token.access_token});
const db=new Firestore({projectId,databaseId,authClient});
const store=firestoreStore(db);
const pets=petStore(db,{async put(){throw new Error('No fixture photos');},async get(){throw new Error('No fixture photos');}});
const fixtures=[
  {id:'dev-sample-alex',name:'[TEST / 测试] Alex — development only',language:'en',pets:[['dev-sample-mochi','[TEST / 测试] Mochi'],['dev-sample-biscuit','[TEST / 测试] Biscuit']]},
  {id:'dev-sample-lin',name:'[TEST / 测试] 林小雨 — development only',language:'zh',pets:[['dev-sample-doudou','[TEST / 测试] 豆豆 Doudou']]},
];
const actor='development-fixtures';
for(const fixture of fixtures){
  const ref=db.collection('customers').doc(fixture.id);
  const previous=await ref.get();
  if(!previous.exists) await store.save(fixture.id,{name:fixture.name,email:'',phone:'',language:fixture.language,version:0},actor);
  else if(previous.data().ownerUid || !previous.data().name.startsWith('[TEST / 测试]')) throw new Error('Fixture ID belongs to a non-sample record');
  for(const [id,name] of fixture.pets){
    if(!(await ref.collection('pets').doc(id).get()).exists) await pets.save({uid:actor,admin:true},fixture.id,id,{name,version:0});
  }
}
console.log('Dev fixtures ready: two sample customers and three pets. Existing records were not overwritten.');
await db.terminate();
