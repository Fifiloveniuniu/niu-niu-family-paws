import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendRecords } from '../apps/web/src/record-list-state.ts';
test('record continuations retain order and update overlaps without duplicating records', () => {
  assert.deepEqual(
    appendRecords(
      [
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
      ],
      [
        { id: 'b', value: 3 },
        { id: 'c', value: 4 },
      ],
    ),
    [
      { id: 'a', value: 1 },
      { id: 'b', value: 3 },
      { id: 'c', value: 4 },
    ],
  );
});
test('equal pet and event IDs from different owners or event kinds remain distinct', () => {
  const rows = ['owner-a', 'owner-b'].map((id) => ({ customer: { id }, pet: { id: 'same' } }));
  assert.equal(appendRecords([], rows).length, 2);
  const events = rows.flatMap((row) =>
    ['booking', 'balance'].map((kind) => ({ ...row, event: { id: 'same', kind } })),
  );
  assert.equal(appendRecords(events, events).length, 4);
});
test('access accounts deduplicate by immutable UID instead of editable email', () => {
  assert.deepEqual(
    appendRecords(
      [{ uid: 'a', email: 'old' }],
      [
        { uid: 'a', email: 'new' },
        { uid: 'b', email: 'old' },
      ],
    ),
    [
      { uid: 'a', email: 'new' },
      { uid: 'b', email: 'old' },
    ],
  );
});
