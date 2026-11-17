import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicMarketingContent } from './public-marketing-content';
import { StoryQuotes } from './marketing-galleries';
import { ServiceSymbol } from './marketing-pages';
function CountUp({ value }: { value?: number }) {
  const element = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined) return;
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      setDisplay(value);
    };
    const start = () => {
      observer?.disconnect();
      if (preference.matches) {
        stop();
        return;
      }
      const initial = current.current;
      const at = performance.now();
      const update = (now: number) => {
        const t = Math.min(1, (now - at) / 800);
        current.current = Math.round(initial + (value - initial) * (1 - (1 - t) ** 3));
        setDisplay(current.current);
        if (t < 1) frame = requestAnimationFrame(update);
      };
      frame = requestAnimationFrame(update);
    };
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { threshold: 0.2 },
    );
    if (element.current) observer.observe(element.current);
    preference.addEventListener('change', stop);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', stop);
    };
  }, [value]);
  return (
    <span
      ref={element}
      className="live-number"
      style={
        { '--number-digits': new Intl.NumberFormat().format(value ?? 0).length } as CSSProperties
      }
      aria-label={value === undefined ? undefined : new Intl.NumberFormat().format(value)}
    >
      <span aria-hidden={value !== undefined}>
        {value === undefined ? '—' : new Intl.NumberFormat().format(display)}
      </span>
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
        <figure data-scroll-object="pet-left">
          <img
            src="/images/marketing/grooming-tools.webp"
            alt={zh ? '美容主题示例照片，非本店实拍' : 'Grooming inspiration sample, not our shop'}
            width="450"
            height="560"
            loading="lazy"
          />
          <figcaption>
            {zh ? '美容主题示例 · 非本店实拍' : 'Sample photo · not our space'}
          </figcaption>
        </figure>
        <figure data-scroll-object="pet-right">
          <img
            src="/images/marketing/gentle-wash.webp"
            alt={
              zh ? '毛发护理示例照片，非本店服务记录' : 'Coat care sample, not our service record'
            }
            width="450"
            height="560"
            loading="lazy"
          />
          <figcaption>{zh ? '我们的真实图集即将更新' : 'Our own gallery is on its way'}</figcaption>
        </figure>
      </div>
    </section>
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
            <CountUp value={content.stats[key]?.value} />
            <h3>{label}</h3>
            <p>
              {content.stats[key]
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
      <a className="text-link" href="/about/#family-stories">
        {zh ? '更多家长的故事' : 'More family stories'} ↗
      </a>
      <a className="text-link" href="/academy/">
        {zh ? '也来看看学员的成长故事' : 'Our students’ next chapter'} ↗
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
