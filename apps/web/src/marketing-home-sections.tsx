import { easeOutExpo } from './marketing-easing';
import { marketingPreview } from './marketing-preview';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicMarketingContent, type StatKey } from './public-marketing-content';
import { StoryQuotes } from './marketing-galleries';
import { ServiceSymbol } from './marketing-pages';
function CountUp({ value }: { value?: number }) {
  const element = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const formatter = useMemo(() => new Intl.NumberFormat(), []);
  const totalLabel = useMemo(
    () => (value === undefined ? undefined : formatter.format(value)),
    [formatter, value],
  );
  useEffect(() => {
    if (value === undefined) return;
    let frame = 0;
    let started = false;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      cancelAnimationFrame(frame);
      setDisplay(value);
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      setDisplay(preference.matches ? value : 0);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (preference.matches) {
        stop();
        return;
      }
      setDisplay(0);
      const at = performance.now();
      const update = (now: number) => {
        const t = Math.min(1, (now - at) / 1100);
        setDisplay(Math.round(value * easeOutExpo(t)));
        if (t < 1) frame = requestAnimationFrame(update);
      };
      frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const entered = entry.isIntersecting && entry.intersectionRatio >= 0.2;
          if (!entered || started) continue;
          started = true;
          start();
          observer.disconnect();
        }
      },
      { threshold: [0, 0.2] },
    );
    const onPreference = () => {
      if (preference.matches) stop();
      else if (!started) reset();
    };
    reset();
    if (element.current) observer.observe(element.current);
    preference.addEventListener('change', onPreference);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', onPreference);
    };
  }, [value]);
  if (value === undefined) return null;
  return (
    <span
      ref={element}
      className="live-number"
      style={{ '--number-digits': totalLabel?.length ?? 1 } as CSSProperties}
      aria-label={totalLabel}
    >
      <span aria-hidden={value !== undefined}>{formatter.format(display)}</span>
    </span>
  );
}
export function HomeSpaces() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <section
      id="spaces"
      className="home-spaces home-added-scene"
      data-cinematic-panel
      data-scroll-scene
      aria-labelledby="home-spaces-title"
    >
      <div>
        <p className="eyebrow">{zh ? '看看我们的小天地' : 'A LITTLE LOOK AROUND'}</p>
        <h2 id="home-spaces-title">
          {zh ? '小小天地，满满心意。' : 'Little spaces. Thoughtful details.'}
        </h2>
        <p>
          {zh
            ? '走进照护家庭与美容店，了解陪伴与学习发生的地方。'
            : 'A peek at our care homes and grooming shop—the places for everyday care and new beginnings.'}
        </p>
        <a className="text-link" href="/spaces/">
          {zh ? '走进我们的小天地' : 'Explore our spaces'} ↗
        </a>
        <a className="text-link" href="/academy/">
          {zh ? '走进美容师课堂' : 'Meet the academy'} ↗
        </a>
      </div>
      <div className="home-photo-pair">
        <figure data-space-photo="left">
          <img
            src="/images/marketing/grooming.png"
            alt={zh ? '宠物美容护理' : 'Pet grooming and coat care'}
            width="1049"
            height="1400"
            loading="lazy"
          />
          <figcaption>{zh ? '美容台上的小日常' : 'At the grooming table'}</figcaption>
        </figure>
        <figure data-space-photo="right">
          <img
            src="/images/marketing/washing.png"
            alt={zh ? '温柔的洗护时光' : 'A gentle wash and coat care'}
            width="1049"
            height="1400"
            loading="lazy"
          />
          <figcaption>{zh ? '温柔的洗护时光' : 'A little time for gentle care'}</figcaption>
        </figure>
      </div>
    </section>
  );
}
function MetricArtwork({ kind }: { kind: StatKey }) {
  return (
    <span className={`metric-art metric-art-${kind}`} aria-hidden="true">
      {kind === 'petsCaredFor' ? (
        <svg className="care-symbol metric-paw" viewBox="0 0 100 100">
          <g className="metric-paw-toes" fill="currentColor">
            <ellipse cx="23" cy="35" rx="8" ry="11" transform="rotate(-28 23 35)" />
            <ellipse cx="41" cy="24" rx="8" ry="11" transform="rotate(-8 41 24)" />
            <ellipse cx="61" cy="24" rx="8" ry="11" transform="rotate(8 61 24)" />
            <ellipse cx="79" cy="35" rx="8" ry="11" transform="rotate(28 79 35)" />
          </g>
          <path
            className="metric-paw-pad"
            d="M28 60q9-24 22-20 13-4 22 20 10 22-8 22-14-9-28 0-18 0-8-22Z"
            fill="currentColor"
          />
          <path
            d="M43 64q7 6 14 0"
            fill="none"
            stroke="#faf8f2"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <ServiceSymbol kind={kind === 'groomingAppointments' ? 'grooming' : 'academy'} />
      )}
    </span>
  );
}
export function HomeNumbers() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const content = usePublicMarketingContent();
  const metrics = [
    ['petsCaredFor', zh ? '照顾过的小伙伴' : 'Pets cared for'],
    ['groomingAppointments', zh ? '完成的美容服务' : 'Grooming appointments'],
    ['groomersTrained', zh ? '培训过的美容师' : 'Groomers trained'],
  ] as const;
  return (
    <section
      id="numbers"
      className="home-numbers home-added-scene"
      data-cinematic-panel
      data-scroll-scene
      aria-labelledby="home-numbers-title"
    >
      <div className="home-section-intro">
        <p className="eyebrow">{zh ? '小爪印，成长的故事' : 'LITTLE PAWS, GROWING STORIES'}</p>
        <h2 id="home-numbers-title">
          {zh ? '每一份陪伴，都值得记录。' : 'Every little one counts.'}
        </h2>
        <p>
          {zh
            ? '每一次照顾、每一份成长，都是我们故事的一部分。'
            : 'Every pet, every fresh coat, every new beginning. All part of our story.'}
        </p>
      </div>
      <div className="number-grid">
        {metrics.map(([key, label]) => (
          <article key={key}>
            <MetricArtwork kind={key} />
            <div className="metric-value">
              <CountUp value={content.stats[key]?.value} />
            </div>
            <div className="metric-copy">
              <h3>{label}</h3>
              <p>
                {marketingPreview
                  ? zh
                    ? '陪伴每一个小小成长'
                    : 'Little moments. Growing stories.'
                  : content.stats[key]
                    ? (zh ? '已核实 · 截至 ' : 'Verified · as of ') +
                      new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(content.stats[key]!.asOf))
                    : zh
                      ? '核实后的数字即将公布'
                      : 'Verified totals coming soon'}
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="cute-note">{zh ? '小小爪印，大大的故事。' : 'Small paws. A growing story.'}</p>
    </section>
  );
}
export function HomeStories() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const content = usePublicMarketingContent();
  return (
    <section
      id="stories"
      className="home-stories home-added-scene"
      data-cinematic-panel
      data-scroll-scene
      aria-labelledby="home-stories-title"
    >
      <div className="home-section-intro">
        <p className="eyebrow">{zh ? '来自共同的故事' : 'FROM ONE FAMILY TO ANOTHER'}</p>
        <h2 id="home-stories-title">
          {zh ? '家长们的暖心分享。' : 'Kind words from our families.'}
        </h2>
        <p>
          {zh
            ? '那些温暖的小瞬间，值得用自己的话说出来。'
            : 'The little moments, told by the people who know them best.'}
        </p>
      </div>
      <StoryQuotes stories={content.testimonials.slice(0, 1)} preview />
      {content.testimonials.length > 0 && (
        <a className="text-link" href="/about/#family-stories">
          {zh ? '更多家长的故事' : 'More family stories'} ↗
        </a>
      )}
      <a className="text-link" href="/academy/">
        {zh ? '了解美容师成长课堂' : 'Explore Grooming Academy'} ↗
      </a>
    </section>
  );
}
export function HomeServiceExtras() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <>
      {[
        {
          id: 'grooming',
          kind: 'grooming' as const,
          name: zh ? '宠物美容' : 'Pet grooming',
          tag: zh ? '清爽可爱，刚刚好。' : 'A little freshen-up.',
          href: '/services/#grooming',
        },
        {
          id: 'training',
          kind: 'academy' as const,
          name: zh ? '美容师成长课堂' : 'Grooming Academy',
          tag: zh ? '每一剪，都是成长。' : 'Small steps. Skilled hands.',
          href: '/academy/',
        },
      ].map((service) => (
        <a className="service-path" href={service.href} key={service.id} data-scroll-object="rise">
          <span className="service-path-icon" aria-hidden="true">
            <ServiceSymbol kind={service.kind} />
          </span>
          <span>
            <span className="eyebrow">{zh ? '新的开始' : 'A NEW CHAPTER'}</span>
            <h3>{service.name}</h3>
            <p>{service.tag}</p>
          </span>
          <span className="path-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      ))}
    </>
  );
}
