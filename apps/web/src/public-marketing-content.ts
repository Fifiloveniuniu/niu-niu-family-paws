import { useEffect, useState } from 'react';
export type PublicText = { en: string; zh: string };
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
    ? { en: data.en, zh: data.zh }
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
export function usePublicMarketingContent() {
  const [content, setContent] = useState(emptyContent);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let request: AbortController | undefined;
    async function refresh() {
      if (document.hidden || disposed) return;
      clearTimeout(timer);
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch('/marketing-content.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.ok) {
          const parsed = parsePublicMarketingContent(await response.json());
          if (!disposed) setContent(parsed);
        }
      } catch {
        /* Keep the last approved snapshot during a connection failure. */
      } finally {
        clearTimeout(timeout);
        if (!disposed) timer = setTimeout(refresh, 60_000);
      }
    }
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return content;
}
