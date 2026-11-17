import { useTranslation } from 'react-i18next';

/** Decorative, original vector portraits; never presented as customer photos. */
export function PetPortrait({ species }: { species: 'dog' | 'cat' | 'rabbit' }) {
  return (
    <svg viewBox="0 0 240 200" aria-hidden="true" focusable="false">
      <circle cx="120" cy="102" r="85" fill="currentColor" opacity=".14" />
      <path d="M39 173q81-15 162 0" fill="none" stroke="currentColor" opacity=".35" />
      {species === 'rabbit' ? (
        <g className="pet-ears" fill="#e9dcc6" stroke="#86745e" strokeWidth="2">
          <ellipse cx="95" cy="65" rx="18" ry="51" transform="rotate(-12 95 65)" />
          <ellipse cx="145" cy="65" rx="18" ry="51" transform="rotate(12 145 65)" />
          <path
            d="M91 32l8 56m50-56-8 56"
            stroke="#cda99a"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </g>
      ) : species === 'cat' ? (
        <path
          className="pet-ears"
          d="M65 109 62 39 111 75m18 0 49-36-3 70"
          fill="#bd8765"
          stroke="#876047"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : (
        <path
          className="pet-ears"
          d="M83 72q-54-29-43 36t43 11m74-47q54-29 43 36t-43 11"
          fill="#86583e"
        />
      )}
      <path
        d="M63 116q0-53 57-53t57 53q0 49-57 49t-57-49"
        fill={species === 'rabbit' ? '#e9dcc6' : species === 'cat' ? '#bd8765' : '#ce9569'}
      />
      <path d="M108 69h24l-6 45q25 14 19 28-25 24-50 0-6-14 19-28z" fill="#faf1df" />
      <g fill="#3e3b31">
        <ellipse className="pet-eye" cx="91" cy="112" rx="4" ry="6" />
        <ellipse className="pet-eye" cx="149" cy="112" rx="4" ry="6" />
        <path d="m112 129 8-3 8 3-8 9z" />
      </g>
      <path
        d="M120 138v5m-10 0q10 10 20 0"
        fill="none"
        stroke="#3e3b31"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {species !== 'dog' && (
        <path
          d="m81 132-30-5m30 12-30 5m108-12 30-5m-30 12 30 5"
          stroke="#86745e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      <path
        d="m187 43 3-10m7 19 10-3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PetCareStories() {
  const { t } = useTranslation();
  return (
    <section data-scroll-scene className="pet-stories" aria-labelledby="pet-stories-title">
      <div className="section-heading">
        <p className="eyebrow">{t('petsLabel')}</p>
        <h2 id="pet-stories-title">{t('petsTitle')}</h2>
        <p>{t('petsIntro')}</p>
      </div>
      <div className="pet-story-grid">
        {(['dog', 'cat', 'rabbit'] as const).map((species, index) => (
          <article
            className={'pet-story pet-story-' + species}
            data-scroll-object="rise"
            key={species}
          >
            <div className="pet-portrait" data-scroll-object="portrait">
              <PetPortrait species={species} />
            </div>
            <p className="eyebrow">
              0{index + 1} / {t(species + 'Name')}
            </p>
            <h3>{t(species + 'Note')}</h3>
            <p>{t(species + 'Body')}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CareStory() {
  const { t } = useTranslation();
  return (
    <section data-scroll-scene className="care-story" aria-labelledby="care-story-title">
      <span className="story-flower" aria-hidden="true" data-scroll-object="portrait">
        ✿
      </span>
      <div data-scroll-object="rise">
        <p className="eyebrow">{t('storyLabel')}</p>
        <h2 id="care-story-title">{t('storyTitle')}</h2>
        <p>{t('storyBody')}</p>
      </div>
      <a className="text-link" href="/services/#prepare" data-scroll-object="rise">
        {t('prepareLink')} <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}

export function VisitPreparation() {
  const { t } = useTranslation();
  return (
    <section
      data-scroll-scene
      id="prepare"
      className="visit-preparation"
      aria-labelledby="prepare-title"
    >
      <div className="section-heading">
        <p className="eyebrow">{t('prepareLabel')}</p>
        <h2 id="prepare-title">{t('prepareTitle')}</h2>
        <p>{t('prepareIntro')}</p>
      </div>
      <ol className="preparation-list">
        {[1, 2, 3, 4].map((number) => (
          <li data-scroll-object="rise" key={number}>
            <span className="preparation-number" aria-hidden="true">
              0{number}
            </span>
            <div>
              <h3>{t('prepare' + number)}</h3>
              <p>{t('prepare' + number + 'Body')}</p>
            </div>
            <span className="preparation-check" aria-hidden="true">
              ✓
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StayPlanning() {
  const { t } = useTranslation();
  return (
    <section data-scroll-scene className="stay-planning" aria-labelledby="planning-title">
      <div data-scroll-object="rise">
        <p className="eyebrow">{t('planningLabel')}</p>
        <h2 id="planning-title">{t('planningTitle')}</h2>
      </div>
      <div data-scroll-object="rise">
        <p>{t('planningBody')}</p>
        <a className="text-link" href="/cancellation-policy/">
          {t('planningLink')} <span aria-hidden="true">↗</span>
        </a>
      </div>
      <span className="planning-rule" data-scroll-object="line" aria-hidden="true" />
    </section>
  );
}
