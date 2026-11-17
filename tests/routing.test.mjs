import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl,parseRoute,safeReturnTo} from '../apps/web/src/routing.ts';
test('canonical routes upgrade old public and app links without losing pet scope',()=>{
 assert.equal(canonicalUrl('/#/balances?pet=Mochi'),'/app/balances/?pet=Mochi');assert.equal(canonicalUrl('/#services'),'/services/');assert.equal(canonicalUrl('/'),'/home/');assert.equal(parseRoute('/home/').kind,'home');assert.equal(canonicalUrl('/#/login'),'/app/sign-in/');assert.equal(canonicalUrl('/app'),'/app/calendar/');assert.equal(canonicalUrl('/faqs'),'/faqs/');
});
test('record paths resolve stable identifiers and reject unknown route shapes',()=>{
 assert.deepEqual(parseRoute('/app/customers/c123/pets/p456/?lookup=Mochi'),{kind:'customers',path:'/app/customers/c123/pets/p456/',search:'?lookup=Mochi',customerId:'c123',petId:'p456'});
 assert.equal(parseRoute('/app/calendar/bookings/sample-0/').bookingId,'sample-0');assert.equal(parseRoute('/app/settings/locations/h123/').locationId,'h123');assert.equal(parseRoute('/app/settings/locations/').locations,true);assert.equal(parseRoute('/app/no-such-page/').kind,'not-found');assert.equal(parseRoute('/services/').kind,'services');
});
test('sign-in return destinations remain in known app routes',()=>{
 assert.equal(safeReturnTo('/app/balances/?pet=p123'),'/app/balances/?pet=p123');for(const value of ['https://evil.test/','//evil.test/','/app/sign-in/','/app/unknown/','/app/\\evil','/app/../evil/',null])assert.equal(safeReturnTo(value),null);
});
