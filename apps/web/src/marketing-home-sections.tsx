import { localeFor, uiText } from './i18n.ts';
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
      tabIndex={0}
    >
      <div>
        <p className="eyebrow">{uiText('ui.marketingHomeSections.aLittleLookAround')}</p>
        <h2 id="home-spaces-title">
          {uiText('ui.marketingHomeSections.littleSpacesThoughtfulDetails')}
        </h2>
        <p>{uiText('ui.marketingHomeSections.aPeekAtOurCareHomesAndGroomingShop')}</p>
        <a className="text-link" href="/spaces/">
          {uiText('ui.marketingHomeSections.exploreOurSpaces')} ↗
        </a>
        <a className="text-link" href="/academy/">
          {uiText('ui.marketingHomeSections.meetTheAcademy')} ↗
        </a>
      </div>
      <div className="home-photo-pair">
        <figure data-space-photo="left">
          <img
            src="/images/marketing/grooming.png"
            alt={uiText('ui.marketingHomeSections.petGroomingAndCoatCare')}
            width="1049"
            height="1400"
            loading="lazy"
          />
          <figcaption>{uiText('ui.marketingHomeSections.atTheGroomingTable')}</figcaption>
        </figure>
        <figure data-space-photo="right">
          <img
            src="/images/marketing/washing.png"
            alt={uiText('ui.marketingHomeSections.aGentleWashAndCoatCare')}
            width="1049"
            height="1400"
            loading="lazy"
          />
          <figcaption>{uiText('ui.marketingHomeSections.aLittleTimeForGentleCare')}</figcaption>
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
    ['petsCaredFor', uiText('ui.marketingHomeSections.petsCaredFor')],
    ['groomingAppointments', uiText('ui.marketingHomeSections.groomingAppointments')],
    ['groomersTrained', uiText('ui.marketingHomeSections.groomersTrained')],
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
        <p className="eyebrow">{uiText('ui.marketingHomeSections.littlePawsGrowingStories')}</p>
        <h2 id="home-numbers-title">{uiText('ui.marketingHomeSections.everyLittleOneCounts')}</h2>
        <p>{uiText('ui.marketingHomeSections.everyPetEveryFreshCoatEveryNewBeginningAll')}</p>
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
                  ? uiText('ui.marketingHomeSections.littleMomentsGrowingStories')
                  : content.stats[key]
                    ? uiText('ui.marketingHomeSections.verifiedAsOf') +
                      new Intl.DateTimeFormat(localeFor(i18n.language), {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(content.stats[key]!.asOf))
                    : uiText('ui.marketingHomeSections.verifiedTotalsComingSoon')}
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="cute-note">{uiText('ui.marketingHomeSections.smallPawsAGrowingStory')}</p>
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
        <p className="eyebrow">{uiText('ui.marketingHomeSections.fromOneFamilyToAnother')}</p>
        <h2 id="home-stories-title">
          {uiText('ui.marketingHomeSections.kindWordsFromOurFamilies')}
        </h2>
        <p>{uiText('ui.marketingHomeSections.theLittleMomentsToldByThePeopleWhoKnow')}</p>
      </div>
      <StoryQuotes stories={content.testimonials.slice(0, 1)} preview />
      {content.testimonials.length > 0 && (
        <a className="text-link" href="/about/#family-stories">
          {uiText('ui.marketingHomeSections.moreFamilyStories')} ↗
        </a>
      )}
      <a className="text-link" href="/academy/">
        {uiText('ui.marketingHomeSections.exploreGroomingAcademy')} ↗
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
          name: uiText('ui.marketingHomeSections.petGrooming'),
          tag: uiText('ui.marketingHomeSections.aLittleFreshenUp'),
          href: '/services/#grooming',
        },
        {
          id: 'training',
          kind: 'academy' as const,
          name: uiText('ui.marketingHomeSections.groomingAcademy'),
          tag: uiText('ui.marketingHomeSections.smallStepsSkilledHands'),
          href: '/academy/',
        },
      ].map((service) => (
        <a className="service-path" href={service.href} key={service.id} data-scroll-object="rise">
          <span className="service-path-icon" aria-hidden="true">
            <ServiceSymbol kind={service.kind} />
          </span>
          <span>
            <span className="eyebrow">{uiText('ui.marketingHomeSections.aNewChapter')}</span>
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
