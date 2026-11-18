import { marketingPreview, previewContent } from './marketing-preview.ts';
import { useEffect, useState } from 'react';
export type PublicText = { en: string; zh: string; [language: string]: string };
export type PublicStory = { quote: PublicText; attribution: PublicText };
export type PublicPhoto = { src: string; caption: PublicText; alt: PublicText };
export type StatKey = 'petsCaredFor' | 'groomingAppointments' | 'groomersTrained';
export type PublicMetric = { value: number; asOf: string };
export type PublicMarketingContent = {
  stats: Partial<Record<StatKey, PublicMetric>>;
  testimonials: PublicStory[];
  studentStories: PublicStory[];
  spacePhotos: PublicPhoto[];
  studentPhotos: PublicPhoto[];
};
export const emptyContent: PublicMarketingContent = {
  stats: {},
  testimonials: [],
  studentStories: [],
  spacePhotos: [],
  studentPhotos: [],
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const localized = (value: unknown): PublicText | undefined => {
  const data = record(value);
  return typeof data.en === 'string' &&
    data.en.trim() &&
    data.en.length <= 2000 &&
    typeof data.zh === 'string' &&
    data.zh.trim() &&
    data.zh.length <= 2000
    ? {
        ...Object.fromEntries(
          Object.entries(data).filter(
            ([key, text]) =>
              /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(key) &&
              typeof text === 'string' &&
              text.length <= 2000,
          ),
        ),
        en: data.en,
        zh: data.zh,
      }
    : undefined;
};
/** Only explicitly approved public content; never read customer directories or private profiles. */
export function parsePublicMarketingContent(input: unknown): PublicMarketingContent {
  const data = record(input);
  if (data.version !== 1) return emptyContent;
  const stats: PublicMarketingContent['stats'] = {};
  for (const key of ['petsCaredFor', 'groomingAppointments', 'groomersTrained'] as const) {
    const metric = record(record(data.stats)[key]);
    if (
      metric.verified === true &&
      Number.isSafeInteger(metric.value) &&
      Number(metric.value) >= 0 &&
      Number(metric.value) <= 1_000_000_000 &&
      typeof metric.asOf === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(metric.asOf) &&
      Number.isFinite(Date.parse(metric.asOf)) &&
      Date.parse(metric.asOf) <= Date.now()
    )
      stats[key] = { value: Number(metric.value), asOf: metric.asOf };
  }
  const stories = (value: unknown): PublicStory[] =>
    !Array.isArray(value)
      ? []
      : value.slice(0, 6).flatMap((item) => {
          const entry = record(item);
          const quote = localized(entry.quote);
          const attribution = localized(entry.attribution);
          return entry.approved === true && quote && attribution ? [{ quote, attribution }] : [];
        });
  const photos = (value: unknown): PublicPhoto[] =>
    !Array.isArray(value)
      ? []
      : value.slice(0, 12).flatMap((item) => {
          const entry = record(item);
          const caption = localized(entry.caption);
          const alt = localized(entry.alt);
          return entry.approved === true &&
            typeof entry.src === 'string' &&
            /^\/images\/marketing\/[a-zA-Z0-9_/-]+\.(webp|jpg|png)$/.test(entry.src) &&
            caption &&
            alt
            ? [{ src: entry.src, caption, alt }]
            : [];
        });
  return {
    stats,
    testimonials: stories(data.testimonials),
    studentStories: stories(data.studentStories),
    spacePhotos: photos(data.spacePhotos),
    studentPhotos: photos(data.studentPhotos),
  };
}
// One public snapshot per page load, shared by all marketing sections and replaying counters.
let snapshot: Promise<PublicMarketingContent> | undefined;
function loadPublicSnapshot() {
  if (!snapshot) {
    snapshot = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch('/marketing-content.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Public content unavailable');
        return parsePublicMarketingContent(await response.json());
      } finally {
        clearTimeout(timeout);
      }
    })().catch((error) => {
      snapshot = undefined;
      throw error;
    });
  }
  return snapshot;
}
export function usePublicMarketingContent() {
  const [content, setContent] = useState(marketingPreview ? previewContent : emptyContent);
  useEffect(() => {
    if (marketingPreview) return;
    let disposed = false;
    void loadPublicSnapshot()
      .then((parsed) => {
        if (!disposed) setContent(parsed);
      })
      .catch(() => {
        /* Preserve the honest empty state; another route can retry a failed connection. */
      });
    return () => {
      disposed = true;
    };
  }, []);
  return content;
}
