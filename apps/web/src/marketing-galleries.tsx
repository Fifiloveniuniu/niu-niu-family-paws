import { localeFor, localizedText, publicText, uiText } from './i18n.ts';
import { marketingPreview } from './marketing-preview';
import { useId, useState } from 'react';
import Modal from './modal';
import { useTranslation } from 'react-i18next';
import {
  usePublicMarketingContent,
  type PublicPhoto,
  type PublicStory,
} from './public-marketing-content';
const suppliedPhotos = [
  {
    src: '/images/marketing/grooming.png',
    caption: localizedText('ui.marketingGalleries.atTheGroomingTable'),
    alt: localizedText('ui.marketingGalleries.petGroomingAndCoatCare'),
  },
  {
    src: '/images/marketing/washing.png',
    caption: localizedText('ui.marketingGalleries.aLittleTimeForGentleCare'),
    alt: localizedText('ui.marketingGalleries.aGentleWashAndCoatCare'),
  },
];
export function PhotoGallery({ student = false }: { student?: boolean }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const zh = lang === 'zh';
  const content = usePublicMarketingContent();
  const actual = student ? content.studentPhotos : content.spacePhotos;
  const entries: (PublicPhoto & { credit?: string; url?: string; sample: boolean })[] =
    actual.length
      ? actual.map((photo) => ({ ...photo, sample: false }))
      : suppliedPhotos.map((photo) => ({ ...photo, sample: false }));
  const [selected, setSelected] = useState<number | null>(null);
  const title = useId();
  const close = () => {
    setSelected(null);
  };
  return (
    <section className="photo-gallery" aria-labelledby={title}>
      <p className="eyebrow">{uiText('ui.marketingGalleries.aCloserLook')}</p>
      <h2 id={title}>
        {student
          ? uiText('ui.marketingGalleries.aCraftWorthACloserLook')
          : uiText('ui.marketingGalleries.theLittleDetailsOfCare')}
      </h2>
      {student && !actual.length && !marketingPreview && (
        <p className="sample-explanation">
          {student
            ? uiText('ui.marketingGalleries.aLookAtGroomingAndCoatCareStudentWork')
            : uiText('ui.marketingGalleries.groomingInspirationShownWithStockPhotosTheseAreNot')}
        </p>
      )}
      <div className="photo-grid">
        {entries.map((photo, index) => (
          <figure key={photo.src}>
            <button
              className="photo-open"
              aria-label={
                uiText('ui.marketingGalleries.enlargePhoto') + publicText(photo.caption, lang)
              }
              onClick={() => setSelected(index)}
            >
              <img
                src={photo.src}
                alt={publicText(photo.alt, lang)}
                width="600"
                height="700"
                loading="lazy"
              />
              <span aria-hidden="true">↗</span>
            </button>
            <figcaption>
              <span className="cute-note">{publicText(photo.caption, lang)}</span>
              {photo.sample && (
                <small>{uiText('ui.marketingGalleries.stockPhotoNotOurBusiness')}</small>
              )}
              {photo.credit && (
                <a href={photo.url} target="_blank" rel="noreferrer">
                  {photo.credit} / Pexels ↗
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {selected !== null && entries[selected] && (
        <Modal
          title={uiText('ui.marketingGalleries.photoViewer')}
          className="photo-dialog"
          onClose={close}
          dismissOnBackdrop
        >
          <div>
            <img src={entries[selected].src} alt={publicText(entries[selected].alt, lang)} />
            <p>
              {publicText(entries[selected].caption, lang)}
              {entries[selected].sample ? uiText('ui.marketingGalleries.stockPhoto') : ''}
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}
export function StoryQuotes({
  stories,
  student = false,
  preview = false,
}: {
  stories: PublicStory[];
  student?: boolean;
  preview?: boolean;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return stories.length ? (
    <div className="story-quotes">
      {stories.map((story, index) => (
        <figure key={index}>
          <blockquote>
            “
            {preview && publicText(story.quote, lang).length > 200
              ? publicText(story.quote, lang).slice(0, 200).trimEnd() + '…'
              : publicText(story.quote, lang)}
            ”
          </blockquote>
          <figcaption>— {publicText(story.attribution, lang)}</figcaption>
        </figure>
      ))}
    </div>
  ) : (
    <div className="story-awaiting">
      <p className="story-empty-title">
        {student
          ? uiText('ui.marketingGalleries.studentStoriesComingSoon', {}, lang)
          : uiText('ui.marketingGalleries.familyStoriesComingSoon', {}, lang)}
      </p>
      <p className="story-empty-detail">
        {student
          ? uiText('ui.marketingGalleries.weLlShareTheirFirstHandLearningExperiencesHere', {}, lang)
          : uiText('ui.marketingGalleries.weLlShareTheirWordsHereWithPermissionFrom', {}, lang)}
      </p>
      <span className="cute-note">
        {uiText('ui.marketingGalleries.everyLittleStoryMatters', {}, lang)}
      </span>
    </div>
  );
}

export function FamilyStories() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const content = usePublicMarketingContent();
  return (
    <section id="family-stories" className="editorial-page" data-scroll-scene>
      <p className="eyebrow">{uiText('ui.marketingGalleries.theLittleMomentsInTheirOwnWords')}</p>
      <h2>{uiText('ui.marketingGalleries.kindWordsFromOurFamilies')}</h2>
      <StoryQuotes stories={content.testimonials} />
    </section>
  );
}
