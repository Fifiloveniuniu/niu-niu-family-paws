import { marketingPreview } from './marketing-preview';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePublicMarketingContent,
  type PublicPhoto,
  type PublicStory,
} from './public-marketing-content';
const suppliedPhotos = [
  {
    src: '/images/marketing/grooming.png',
    caption: { en: 'At the grooming table', zh: '美容台上的小日常' },
    alt: { en: 'Pet grooming and coat care', zh: '宠物美容护理' },
  },
  {
    src: '/images/marketing/washing.png',
    caption: { en: 'A little time for gentle care', zh: '温柔的洗护时光' },
    alt: { en: 'A gentle wash and coat care', zh: '温柔的洗护时光' },
  },
];
export function PhotoGallery({ student = false }: { student?: boolean }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'zh' ? 'zh' : 'en';
  const zh = lang === 'zh';
  const content = usePublicMarketingContent();
  const actual = student ? content.studentPhotos : content.spacePhotos;
  const entries: (PublicPhoto & { credit?: string; url?: string; sample: boolean })[] =
    actual.length
      ? actual.map((photo) => ({ ...photo, sample: false }))
      : suppliedPhotos.map((photo) => ({ ...photo, sample: false }));
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const title = useId();
  useEffect(() => {
    if (selected !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const close = () => {
    setSelected(null);
    opener.current?.focus();
  };
  return (
    <section className="photo-gallery" aria-labelledby={title}>
      <p className="eyebrow">{zh ? '镜头里的小细节' : 'A CLOSER LOOK'}</p>
      <h2 id={title}>
        {student
          ? zh
            ? '学习，从观察开始。'
            : 'A craft worth a closer look.'
          : zh
            ? '小小空间，用心照顾。'
            : 'The little details of care.'}
      </h2>
      {student && !actual.length && !marketingPreview && (
        <p className="sample-explanation">
          {zh
            ? student
              ? '以下展示美容与毛发护理。课堂照片与学员作品将另行分享。'
              : '以下为美容主题素材照片，并非我们的店铺、设备或服务记录。我们的真实图集即将更新。'
            : student
              ? 'A look at grooming and coat care. Student work and class photographs will be shared separately.'
              : 'Grooming inspiration, shown with stock photos. These are not our shop, equipment, or service records. Our own gallery is on its way.'}
        </p>
      )}
      <div className="photo-grid">
        {entries.map((photo, index) => (
          <figure key={photo.src}>
            <button
              className="photo-open"
              aria-label={(zh ? '放大照片：' : 'Enlarge photo: ') + photo.caption[lang]}
              onClick={(event) => {
                opener.current = event.currentTarget;
                setSelected(index);
              }}
            >
              <img src={photo.src} alt={photo.alt[lang]} width="600" height="700" loading="lazy" />
              <span aria-hidden="true">↗</span>
            </button>
            <figcaption>
              <span className="cute-note">{photo.caption[lang]}</span>
              {photo.sample && (
                <small>{zh ? '素材照片 · 非本店实拍' : 'Stock photo · not our business'}</small>
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
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-label={zh ? '照片查看' : 'Photo viewer'}
        onCancel={close}
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        {selected !== null && entries[selected] && (
          <div>
            <button className="photo-close" onClick={close}>
              {zh ? '关闭' : 'Close'} ×
            </button>
            <img src={entries[selected].src} alt={entries[selected].alt[lang]} />
            <p>
              {entries[selected].caption[lang]}
              {entries[selected].sample ? (zh ? ' · 素材照片' : ' · Stock photo') : ''}
            </p>
          </div>
        )}
      </dialog>
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
  const lang = i18n.language === 'zh' ? 'zh' : 'en';
  return stories.length ? (
    <div className="story-quotes">
      {stories.map((story, index) => (
        <figure key={index}>
          <blockquote>
            “
            {preview && story.quote[lang].length > 200
              ? story.quote[lang].slice(0, 200).trimEnd() + '…'
              : story.quote[lang]}
            ”
          </blockquote>
          <figcaption>— {story.attribution[lang]}</figcaption>
        </figure>
      ))}
    </div>
  ) : (
    <div className="story-awaiting">
      <p className="story-empty-title">
        {lang === 'zh'
          ? student
            ? '学员故事即将分享。'
            : '家长故事即将分享。'
          : student
            ? 'Student stories coming soon.'
            : 'Family stories coming soon.'}
      </p>
      <p className="story-empty-detail">
        {lang === 'zh'
          ? student
            ? '获得学员许可后，我们会在这里分享他们的真实学习体验。'
            : '获得家长许可后，我们会在这里分享他们的真实感受。'
          : student
            ? 'We’ll share their first-hand learning experiences here, with their permission.'
            : 'We’ll share their words here, with permission from the families behind them.'}
      </p>
      <span className="cute-note">
        {lang === 'zh' ? '每一段故事，都值得好好珍藏。' : 'Every little story matters.'}
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
      <p className="eyebrow">
        {zh ? '每一段陪伴的故事' : 'THE LITTLE MOMENTS, IN THEIR OWN WORDS'}
      </p>
      <h2>{zh ? '家长们的暖心分享' : 'Kind words from our families'}</h2>
      <StoryQuotes stories={content.testimonials} />
    </section>
  );
}
