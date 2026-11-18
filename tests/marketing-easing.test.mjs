import test from 'node:test';
import assert from 'node:assert/strict';
import { easeOutExpo } from '../apps/web/src/marketing-easing.ts';

test('chapter easing launches quickly, slows toward arrival and reaches exact endpoints', () => {
  assert.equal(easeOutExpo(-1), 0);
  assert.equal(easeOutExpo(0), 0);
  assert.equal(easeOutExpo(1), 1);
  assert.equal(easeOutExpo(2), 1);
  assert.equal(easeOutExpo(0.1), 0.5);
  assert.equal(easeOutExpo(0.5), 0.96875);
  const early = easeOutExpo(0.2) - easeOutExpo(0.1);
  const late = easeOutExpo(0.9) - easeOutExpo(0.8);
  assert.ok(early > late * 50);
});
