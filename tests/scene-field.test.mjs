import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneField, mixInk, chapterReveal } from '../apps/web/src/scene-field.ts';

test('center expansion starts transparent, reaches every corner and blends ink consistently', () => {
  for (const [width, height] of [
    [320, 744],
    [1440, 861],
  ]) {
    const start = sceneField(width, height, 0),
      middle = sceneField(width, height, 0.5),
      end = sceneField(width, height, 1);
    assert.equal(start.strength, 0);
    assert.equal(start.outer, 0);
    assert.equal(middle.cx, width / 2);
    assert.equal(middle.cy, height / 2);
    assert.ok(middle.outer > 0 && middle.outer < end.outer);
    assert.ok(end.inner >= Math.hypot(width, height) / 2 - 0.00001);
    assert.equal(end.strength, 1);
  }
  assert.equal(mixInk('#000000', '#ffffff', 0.5), 'rgb(128,128,128)');
});

test('hard green transitions use one crisp radius and honor an explicit origin', () => {
  const field = sceneField(1440, 861, 0.5, { center: { x: 720, y: 386 }, hard: true });
  assert.equal(field.inner, field.outer);
  assert.equal(field.cy, 386);
  assert.equal(field.strength, 0.5);
  assert.equal(sceneField(1440, 861, 0, { hard: true }).strength, 0);
});

test('chapter reveal waits for half entry and holds until half departure', () => {
  for (const height of [740, 861]) {
    assert.equal(chapterReveal(height, height), 0);
    assert.equal(chapterReveal(height * 0.5, height), 0);
    assert.equal(chapterReveal(height * 0.25, height), 0.5);
    assert.equal(chapterReveal(0, height), 1);
    assert.equal(chapterReveal(-height * 0.4, height), 1);
    assert.equal(chapterReveal(-height * 0.5, height), 1);
    assert.equal(chapterReveal(-height * 0.75, height), 0.5);
    assert.equal(chapterReveal(-height, height), 0);
  }
});

test('every chapter palette fades with its expansion and shrinking progress', () => {
  for (const hard of [false, true]) {
    const strengths = [0, 0.25, 0.5, 0.75, 1].map(
      (p) => sceneField(390, 772, p, { hard }).strength,
    );
    assert.deepEqual(strengths, [0, 0.15625, 0.5, 0.84375, 1]);
  }
});
