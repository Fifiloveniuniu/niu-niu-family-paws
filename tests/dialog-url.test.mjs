import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogUrl } from '../apps/web/src/dialog-url.ts';
import { parseRoute, safeReturnTo } from '../apps/web/src/routing.ts';
test('dialog links retain page, language, customer filters and anchors across refresh/sign-in', () => {
  const url = dialogUrl(
    '/app/calendar/?lang=zh&customer=customer-1&date=2027-03-01#calendar',
    'dialog.booking-add',
    'new',
  );
  const parsed = new URL(url, 'https://example.test');
  assert.equal(parsed.searchParams.get('lang'), 'zh');
  assert.equal(parsed.searchParams.get('customer'), 'customer-1');
  assert.equal(parsed.searchParams.get('dialog.booking-add'), 'new');
  assert.equal(parsed.hash, '#calendar');
  assert.equal(parseRoute(url).kind, 'calendar');
  assert.equal(safeReturnTo(url), url);
});
test('closing a parent dialog removes its nested editor while preserving unrelated filters and dialogs', () => {
  const url = dialogUrl(
    '/app/calendar/?lang=en&dialog.location-edit=target&dialog.house-edit=house-1&dialog.room-edit=room-1&dialog.appearance=true&house=house-1',
    'dialog.location-edit',
    null,
  );
  const search = new URL(url, 'https://example.test').searchParams;
  assert.equal(search.has('dialog.location-edit'), false);
  assert.equal(search.has('dialog.house-edit'), false);
  assert.equal(search.has('dialog.room-edit'), false);
  assert.equal(search.get('house'), 'house-1');
  assert.equal(search.get('dialog.appearance'), 'true');
});
test('routed new forms need no private draft data, and unknown dialog parameter names are rejected', () => {
  const url = dialogUrl('/app/customers/?lang=es', 'dialog.customer-edit', 'new');
  assert.equal(
    new URL(url, 'https://example.test').searchParams.get('dialog.customer-edit'),
    'new',
  );
  assert.equal(parseRoute(url).kind, 'customers');
  assert.throws(() => dialogUrl('/app/', 'returnTo', 'https://example.test'));
});
