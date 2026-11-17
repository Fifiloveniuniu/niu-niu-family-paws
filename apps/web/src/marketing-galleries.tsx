import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  usePublicMarketingContent,
  type PublicPhoto,
  type PublicStory,
} from './public-marketing-content';
const samples = [
  {
    src: '/images/marketing/grooming-tools.webp',
    name: { en: 'Tools of the craft', zh: '手艺与工具' },
    alt: {
      en: 'Sample photograph of a small dog being groomed on a grooming table',
      zh: '示例照片：小狗在美容台上接受护理',
    },
    credit: 'Gustavo Fring',
    url: 'https://www.pexels.com/photo/vet-with-dog-6816846/',
  },
  {
    src: '/images/marketing/gentle-wash.webp',
    name: { en: 'A closer look at coat care', zh: '近距离了解毛发护理' },
    alt: {
      en: 'Sample photograph of a Yorkshire terrier being bathed',
      zh: '示例照片：约克夏犬正在洗澡',
    },
    credit: 'Tima Miroshnichenko',
    url: 'https://www.pexels.com/photo/close-up-photo-of-bathing-of-dog-6131161/',
  },
  {
    src: '/images/marketing/coat-care.webp',
    name: { en: 'The little details', zh: '护理中的小细节' },
    alt: {
      en: 'Sample close-up photograph of a dog being washed',
      zh: '示例照片：为狗狗清洗毛发的近景',
    },
    credit: 'Tima Miroshnichenko',
    url: 'https://www.pexels.com/photo/close-up-photo-of-bathing-of-dog-6131165/',
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
      : samples.map((photo) => ({
          src: photo.src,
          caption: photo.name,
          alt: photo.alt,
          credit: photo.credit,
          url: photo.url,
          sample: true,
        }));
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
      {!actual.length && (
        <p className="sample-explanation">
          {zh
            ? student
              ? '以下为美容主题示例照片，并非本校学员、课程或作品。真实课堂照片与学员作品即将更新。'
              : '以下为美容主题示例照片，并非我们的店铺、设备或服务记录。我们的真实图集即将更新。'
            : student
              ? 'Grooming inspiration, shown with sample photos. These are not our students, classes, or student work. Our own class gallery is on its way.'
              : 'Grooming inspiration, shown with sample photos. These are not our shop, equipment, or service records. Our own gallery is on its way.'}
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
                <small>{zh ? '示例照片 · 非本店实拍' : 'Sample photo · not our business'}</small>
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
              {entries[selected].sample ? (zh ? ' · 示例照片' : ' · Sample photo') : ''}
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
          <span className="quote-mark" aria-hidden="true">
            “
          </span>
          <blockquote>
            {preview && story.quote[lang].length > 200
              ? story.quote[lang].slice(0, 200).trimEnd() + '…'
              : story.quote[lang]}
          </blockquote>
          <figcaption>— {story.attribution[lang]}</figcaption>
        </figure>
      ))}
    </div>
  ) : (
    <div className="story-awaiting">
      <span className="quote-mark" aria-hidden="true">
        “
      </span>
      <p>
        {lang === 'zh'
          ? student
            ? '真实学员的成长故事，即将分享。'
            : '家长们的真实暖心分享，即将与您见面。'
          : student
            ? 'First-hand student stories are on their way.'
            : 'Their kind words deserve a little space here.'}
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
