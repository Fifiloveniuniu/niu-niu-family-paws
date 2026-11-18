import test from 'node:test';
import assert from 'node:assert/strict';
import { fitsCapacity, capacityIssue, blockedSpans } from '../apps/api/src/booking-capacity.ts';
const t = (value) => `2030-01-0${value}T10:00:00.000Z`;
const candidate = {
  id: 'new',
  petId: 'pet',
  houseId: 'h',
  roomId: 'r',
  species: 'dog',
  units: 0.1,
  arrival: t(1),
  pickup: t(5),
  status: 'planned',
};
const stay = (extra = {}) => ({
  ...candidate,
  id: 'other',
  petId: 'other-pet',
  units: 0.2,
  ...extra,
});
test('decimal room capacity uses exact decimal sums', () => {
  assert.equal(fitsCapacity([0.1, 0.2], 0.3), true);
  assert.equal(fitsCapacity([0.1, 0.200000000001], 0.3), false);
  assert.equal(fitsCapacity([1e-12, 2e-12], 3e-12), true);
  assert.equal(fitsCapacity([NaN], 1), false);
  assert.equal(capacityIssue([stay()], candidate, 0.3, 0), null);
  assert.equal(capacityIssue([stay({ units: 0.3 })], candidate, 0.3, 0), 'capacity');
});
test('capacity is evaluated at every occupancy change with pet, species, overdue and turnover checks', () => {
  assert.equal(
    capacityIssue([stay({ arrival: t(2), pickup: t(3), units: 0.3 })], candidate, 0.3, 0),
    'capacity',
  );
  assert.equal(
    capacityIssue([stay({ houseId: 'another', petId: 'pet' })], candidate, 1, 0),
    'pet_overlap',
  );
  assert.equal(capacityIssue([stay({ species: 'cat' })], candidate, 1, 0), 'species');
  assert.equal(
    capacityIssue([stay({ arrival: t(5), pickup: t(6) })], candidate, 1, 0),
    'turnover_unconfigured',
  );
  assert.equal(capacityIssue([stay({ status: 'completed' })], candidate, 0.1, 0), null);
  assert.equal(
    capacityIssue(
      [stay({ arrival: t(1), pickup: t(2), status: 'in_care', actualArrival: t(1) })],
      { ...candidate, arrival: t(4) },
      1,
      Date.parse(t(3)),
    ),
    'overdue',
  );
});
test('blocked spans aggregate occupancy without guest identities and release completed stays', () => {
  const spans = blockedSpans(
    [stay({ arrival: t(2), pickup: t(3), species: 'cat' })],
    candidate,
    1,
    Date.parse(t(1)),
    Date.parse(t(5)),
    0,
  );
  assert.deepEqual(spans, [{ from: t(2), through: t(3), issue: 'species' }]);
  assert.equal(JSON.stringify(spans).includes('other-pet'), false);
});
