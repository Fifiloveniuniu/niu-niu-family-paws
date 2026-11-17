import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import './cinematic-story.css';
import HomeIllustration from './home-illustration';
import StoryLandscape, { CareSymbol } from './story-landscape';
import { PetPortrait } from './marketing-sections';
import { GardenArch, GardenBranch, GardenBlossom } from './garden-art';

export default function MarketingHome() {
  const { t } = useTranslation();
  const chapters = [
    { anchor: 'main', label: t('home') },
    { anchor: 'experience', label: t('cinemaExperience') },
    { anchor: 'about', label: t('approach') },
    { anchor: 'services', label: t('services') },
    { anchor: 'faq', label: t('questions') },
    { anchor: 'contact', label: t('contact') },
  ];
  return (
    <div
      className="home-story cinematic-story"
      data-cinematic-story
      style={{ '--chapter-gaps': chapters.length - 1 } as CSSProperties}
    >
      <div className="cinema-markers" aria-hidden="true">
        {chapters.slice(1).map((chapter, index) => (
          <span
            key={chapter.anchor}
            data-cinema-anchor={chapter.anchor}
            style={{ '--chapter-index': index + 1 } as CSSProperties}
          />
        ))}
      </div>
      <div className="cinematic-stage">
        <StoryLandscape />
        <section
          className="scroll-hero"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="home-title"
        >
          <div className="scene-sticky hero-stage">
            <div className="hero-message" data-scroll-object="hero-copy">
              <p className="eyebrow">{t('homeEyebrow')}</p>
              <h1 id="home-title">
                {t('homeTitle')
                  .split('\n')
                  .map((line, index) => (
                    <span className={index ? 'title-love' : undefined} key={line}>
                      {line}
                    </span>
                  ))}
              </h1>
              <p className="home-lead">{t('homeIntro')}</p>
              <a className="button" href="#experience">
                {t('homeDiscover')} <span aria-hidden="true">↓</span>
              </a>
              <p className="small-signature">{t('homeSignature')}</p>
            </div>
            <div className="hero-world" aria-hidden="true">
              <GardenArch />
              <div className="garden-leaf leaf-left" data-scroll-object="leaf-left">
                <GardenBranch />
              </div>
              <div className="garden-leaf leaf-right" data-scroll-object="leaf-right">
                <GardenBranch mirrored />
              </div>
              <div className="garden-flower hero-flower" data-scroll-object="bloom">
                <GardenBlossom />
              </div>
              <span className="world-orbit orbit-one" data-scroll-object="orbit" />
              <span className="world-orbit orbit-two" data-scroll-object="orbit-reverse" />
              <div className="world-dog" data-scroll-object="hero-pet">
                <HomeIllustration />
              </div>
              <span className="world-note" data-scroll-object="note">
                {t('homeArtNote')}
              </span>
              <span className="world-spark spark-one" data-scroll-object="spark">
                ✦
              </span>
              <span className="world-spark spark-two" data-scroll-object="spark-reverse">
                ✿
              </span>
            </div>
            <div className="scene-caption">
              <span>01 / NIU NIU FAMILY PAWS</span>
              <span>{t('homeScroll')} ↓</span>
            </div>
          </div>
        </section>

        <section
          id="experience"
          className="experience-scene"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="experience-title"
        >
          <div className="scene-sticky experience-stage">
            <div className="experience-heading">
              <span className="chapter-number" aria-hidden="true">
                {t('experienceChapter')}
              </span>
              <p className="eyebrow">{t('experienceLabel')}</p>
              <h2 id="experience-title">{t('experienceTitle')}</h2>
              <p>{t('experienceIntro')}</p>
            </div>
            <div
              className="experience-vine vine-left"
              data-scroll-object="leaf-left"
              aria-hidden="true"
            >
              <GardenBranch />
            </div>
            <div
              className="experience-vine vine-right"
              data-scroll-object="leaf-right"
              aria-hidden="true"
            >
              <GardenBranch mirrored />
            </div>
            <div className="experience-portraits" aria-hidden="true">
              <div className="experience-pet experience-dog" data-scroll-object="pet-left">
                <PetPortrait species="dog" />
              </div>
              <div className="experience-pet experience-cat" data-scroll-object="pet-center">
                <PetPortrait species="cat" />
              </div>
              <div className="experience-pet experience-rabbit" data-scroll-object="pet-right">
                <PetPortrait species="rabbit" />
              </div>
            </div>
            <ol className="experience-steps">
              {[1, 2, 3].map((number) => (
                <li key={number} data-scroll-object={'step-' + number}>
                  <span className="step-marker">0{number}</span>
                  <h3>{t('experience' + number)}</h3>
                  <p>{t('experience' + number + 'Body')}</p>
                </li>
              ))}
            </ol>
            <span className="experience-track" aria-hidden="true">
              <span data-scroll-object="progress" />
            </span>
          </div>
        </section>

        <section
          id="about"
          className="home-trust"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="trust-title"
        >
          <div className="home-section-intro" data-scroll-object="rise">
            <p className="eyebrow">{t('trustLabel')}</p>
            <h2 id="trust-title">{t('trustTitle')}</h2>
            <a className="text-link" href="/about/">
              {t('trustLink')} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="trust-principles">
            {[1, 2, 3].map((number) => (
              <article key={number} data-scroll-object="rise">
                <span className="trust-symbol" aria-hidden="true">
                  <CareSymbol kind={(['heart', 'orbit', 'check'] as const)[number - 1]} />
                </span>
                <div>
                  <h3>{t('trust' + number)}</h3>
                  <p>{t('trust' + number + 'Body')}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="services"
          className="home-services"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="home-services-title"
        >
          <div className="home-section-intro" data-scroll-object="rise">
            <p className="eyebrow">{t('homeServicesLabel')}</p>
            <h2 id="home-services-title">{t('homeServicesTitle')}</h2>
            <p>{t('homeServicesIntro')}</p>
          </div>
          <a className="service-path" href="/services/" data-scroll-object="rise">
            <span className="service-path-icon" aria-hidden="true">
              <CareSymbol kind="day" />
            </span>
            <span>
              <span className="eyebrow">{t('homeDayLabel')}</span>
              <h3>{t('day')}</h3>
              <p>{t('homeDayBody')}</p>
            </span>
            <span className="path-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <a className="service-path" href="/services/#boarding" data-scroll-object="rise">
            <span className="service-path-icon" aria-hidden="true">
              <CareSymbol kind="night" />
            </span>
            <span>
              <span className="eyebrow">{t('homeNightLabel')}</span>
              <h3>{t('night')}</h3>
              <p>{t('homeNightBody')}</p>
            </span>
            <span className="path-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </section>

        <section
          id="faq"
          className="home-questions"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="home-questions-title"
        >
          <div className="question-art" aria-hidden="true">
            <span className="question-flower" data-scroll-object="bloom">
              <GardenBlossom />
            </span>
            <span className="question-branch" data-scroll-object="leaf-right">
              <GardenBranch mirrored />
            </span>
          </div>
          <div data-scroll-object="rise">
            <p className="eyebrow">{t('homeQuestionsLabel')}</p>
            <h2 id="home-questions-title">{t('homeQuestionsTitle')}</h2>
            <p>{t('homeQuestionsBody')}</p>
            <a className="text-link" href="/faqs/">
              {t('homeQuestionsLink')} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section
          id="contact"
          className="home-contact"
          data-cinematic-panel
          data-scroll-scene
          aria-labelledby="home-contact-title"
        >
          <div className="contact-bloom" data-scroll-object="bloom" aria-hidden="true">
            <GardenBlossom />
          </div>
          <p className="eyebrow" data-scroll-object="rise">
            {t('homeContactLabel')}
          </p>
          <h2 id="home-contact-title" data-scroll-object="rise">
            {t('homeContactTitle')}
          </h2>
          <p data-scroll-object="rise">{t('homeContactBody')}</p>
          <span className="contact-status">{t('pending')}</span>
        </section>
        <nav className="cinema-rail" aria-label={t('cinemaChapters')}>
          {chapters.map((chapter) => (
            <a
              key={chapter.anchor}
              href={'#' + chapter.anchor}
              title={chapter.label}
              aria-label={chapter.label}
              data-chapter-link
            >
              <span />
            </a>
          ))}
        </nav>
        <div className="cinema-controls">
          <span className="cinema-count" aria-hidden="true">
            <span data-cinema-count>01</span> / 06
          </span>
          <span className="cinema-progress" aria-hidden="true">
            <span />
          </span>
          <a
            href="#experience"
            data-cinema-next
            data-next-label={t('cinemaNext')}
            data-restart-label={t('cinemaRestart')}
          >
            {t('cinemaNext')} ↓
          </a>
        </div>
      </div>
    </div>
  );
}
