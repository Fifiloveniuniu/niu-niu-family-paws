import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, parseRoute, safeReturnTo } from '../apps/web/src/routing.ts';
test('canonical routes upgrade old public and app links without losing pet scope', () => {
  assert.equal(canonicalUrl('/#/balances?pet=Mochi'), '/app/balances/?pet=Mochi');
  assert.equal(canonicalUrl('/#services'), '/home/#services');
  assert.equal(canonicalUrl('/home/#about'), '/home/#about');
  assert.equal(parseRoute('/home/#faq').hash, '#faq');
  assert.equal(canonicalUrl('/'), '/home/');
  assert.equal(parseRoute('/home/').kind, 'home');
  assert.equal(canonicalUrl('/#/login'), '/app/sign-in/');
  assert.equal(canonicalUrl('/app'), '/app/calendar/');
  assert.equal(canonicalUrl('/faqs'), '/faqs/');
});
test('record paths resolve stable identifiers and reject unknown route shapes', () => {
  assert.deepEqual(parseRoute('/app/customers/c123/pets/p456/?lookup=Mochi'), {
    kind: 'customers',
    path: '/app/customers/c123/pets/p456/',
    search: '?lookup=Mochi',
    customerId: 'c123',
    petId: 'p456',
  });
  assert.equal(parseRoute('/app/calendar/bookings/sample-0/').bookingId, 'sample-0');
  assert.equal(parseRoute('/app/settings/locations/h123/').kind, 'calendar');
  assert.equal(parseRoute('/app/settings/locations/').kind, 'calendar');
  assert.equal(parseRoute('/app/no-such-page/').kind, 'not-found');
  assert.equal(parseRoute('/services/').kind, 'services');
});
test('sign-in return destinations remain in known app routes', () => {
  assert.equal(safeReturnTo('/app/balances/?pet=p123'), '/app/balances/?pet=p123');
  for (const value of [
    'https://evil.test/',
    '//evil.test/',
    '/app/sign-in/',
    '/app/unknown/',
    '/app/\\evil',
    '/app/../evil/',
    null,
  ])
    assert.equal(safeReturnTo(value), null);
});
test('marketing destinations and legacy cancellation links resolve to their dedicated pages', () => {
  for (const [path, kind] of [
    ['/pricing/', 'pricing'],
    ['/spaces/', 'spaces'],
    ['/academy/', 'academy'],
    ['/contact/', 'contact'],
  ])
    assert.equal(parseRoute(path).kind, kind);
  assert.equal(canonicalUrl('/cancellation-policy/'), '/pricing/#cancellation-policy');
  assert.equal(canonicalUrl('/#/cancellation-policy'), '/pricing/#cancellation-policy');
});

test('retired operations and location settings pages redirect to Calendar with language and query retained', () => {
  for (const path of [
    '/app/operations',
    '/app/settings/locations',
    '/app/settings/locations/h123',
    '/app/settings',
  ]) {
    assert.equal(canonicalUrl(path + '?lang=zh&zone=UTC'), '/app/calendar/?lang=zh&zone=UTC');
    assert.equal(parseRoute(path).kind, 'calendar');
    assert.equal(safeReturnTo(path + '/?lang=en'), '/app/calendar/?lang=en');
  }
  assert.equal(canonicalUrl('/#/settings?lang=zh'), '/app/calendar/?lang=zh');
  assert.equal(parseRoute('/app/settings/cancellation/').cancellation, true);
});
