import test from 'node:test';
import assert from 'node:assert/strict';
import {
  urlLanguage,
  withLanguage,
  withoutLanguage,
  isPageLink,
} from '../apps/web/src/language-url.ts';
import { parseRoute, canonicalUrl, safeReturnTo } from '../apps/web/src/routing.ts';

test('language query parameters preserve filters, records and anchors', () => {
  const url = withLanguage('/app/balances/?customer=c1&pet=Mochi#statement', 'zh');
  assert.equal(url, '/app/balances/?customer=c1&pet=Mochi&lang=zh#statement');
  assert.equal(withoutLanguage(url), '/app/balances/?customer=c1&pet=Mochi#statement');
  assert.equal(urlLanguage(url), 'zh');
  assert.equal(urlLanguage('/home/?lang=unknown'), null);
  assert.equal(withLanguage('/home/?lang=unknown', 'unknown'), '/home/?lang=en');
  assert.deepEqual(parseRoute(url), {
    kind: 'balances',
    path: '/app/balances/',
    search: '?customer=c1&pet=Mochi',
    hash: '#statement',
    language: 'zh',
  });
});
test('legacy and sign-in return links retain the URL language', () => {
  assert.equal(canonicalUrl('/?lang=zh#/balances?pet=Mochi'), '/app/balances/?pet=Mochi&lang=zh');
  assert.equal(
    canonicalUrl('/?lang=zh#/cancellation-policy'),
    '/pricing/?lang=zh#cancellation-policy',
  );
  assert.equal(safeReturnTo('/app/customers/c123/?lang=zh'), '/app/customers/c123/?lang=zh');
});
test('language localization leaves external URLs, downloads and API links alone', () => {
  assert.equal(
    withLanguage('https://external.example/home/', 'zh'),
    'https://external.example/home/',
  );
  assert.equal(withLanguage('mailto:hello@example.test', 'zh'), 'mailto:hello@example.test');
  for (const href of [
    '/api/profile',
    '/images/photo.png',
    '/assets/bundle.js',
    'https://external.example/',
  ])
    assert.equal(isPageLink(href, 'https://family-paws.invalid/home/'), false);
  assert.equal(isPageLink('/app/calendar/?house=1', 'https://family-paws.invalid/home/'), true);
});

test('Spanish language links preserve scoped customer, pet and date context', () => {
  const target = withLanguage('/app/calendar/?asCustomer=c1&pet=p1&date=2030-01-02#room', 'es');
  assert.equal(urlLanguage(target), 'es');
  assert.equal(parseRoute(target).language, 'es');
  assert.equal(target, '/app/calendar/?asCustomer=c1&pet=p1&date=2030-01-02&lang=es#room');
});
