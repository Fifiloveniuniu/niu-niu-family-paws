import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicMarketingContent } from '../apps/web/src/public-marketing-content.ts';
test('public marketing accepts only verified aggregates and explicitly approved bilingual content', () => {
  const text = { en: 'Test fixture', zh: '测试内容' };
  const value = parsePublicMarketingContent({
    version: 1,
    stats: {
      petsCaredFor: { value: 20, verified: true, asOf: '2026-01-01T00:00:00Z' },
      groomersTrained: { value: -1, verified: true, asOf: '2026-01-01T00:00:00Z' },
      groomingAppointments: { value: 200, verified: false, asOf: '2026-01-01T00:00:00Z' },
    },
    testimonials: [
      { approved: true, quote: text, attribution: text },
      { approved: false, quote: text, attribution: text },
    ],
    spacePhotos: [
      { approved: true, src: '/images/marketing/fixture.webp', caption: text, alt: text },
      { approved: true, src: '/api/customers/private/photo', caption: text, alt: text },
      { approved: true, src: '/images/marketing/../private.webp', caption: text, alt: text },
    ],
  });
  assert.deepEqual(value.stats, { petsCaredFor: { value: 20, asOf: '2026-01-01T00:00:00Z' } });
  assert.equal(value.testimonials.length, 1);
  assert.equal(value.spacePhotos.length, 1);
  assert.equal(parsePublicMarketingContent(null).testimonials.length, 0);
});
