import { localeFor, publicText, uiText, uiValue } from './i18n.ts';
import { marketingPreview, previewPrices } from './marketing-preview';
import { PhotoGallery, StoryQuotes } from './marketing-galleries';
import { usePublicMarketingContent } from './public-marketing-content';
import { useTranslation } from 'react-i18next';
import { CareSymbol } from './story-landscape';
import { GardenBlossom } from './garden-art';

export function serviceContent() {
  const services: {
    id: string;
    name: string;
    tag: string;
    body: string;
    note: string;
    kind: 'day' | 'night' | 'grooming' | 'academy' | 'visit' | 'walk';
  }[] = uiValue('ui.marketingPages.content1') as {
    id: string;
    name: string;
    tag: string;
    body: string;
    note: string;
    kind: 'day' | 'night' | 'grooming' | 'academy' | 'visit' | 'walk';
  }[];
  services.splice(
    2,
    0,
    {
      id: 'drop-in',
      name: uiText('ui.marketingPages.dropInVisits'),
      tag: uiText('ui.marketingPages.aLittleCareRightAtHome'),
      body: uiText('ui.marketingPages.visitsToProvideCareForYourPetsInTheir'),
      note: uiText('ui.marketingPages.confirmCareTasksServiceAreaVisitLengthAvailabilityAnd'),
      kind: 'visit' as const,
    },
    {
      id: 'dog-walking',
      name: uiText('ui.marketingPages.dogWalking'),
      tag: uiText('ui.marketingPages.aWalkAndALittleCompany'),
      body: uiText('ui.marketingPages.walksForYourDogWithCompanyAlongTheWay'),
      note: uiText('ui.marketingPages.confirmYourDogSNeedsServiceAreaWalkLength'),
      kind: 'walk' as const,
    },
  );
  return marketingPreview
    ? services.map((service) => ({
        ...service,
        note: previewPrices[service.id]
          ? publicText(previewPrices[service.id]) +
            uiText('ui.marketingPages.letSFindTheRightArrangementTogether')
          : service.note,
      }))
    : services;
}
export function ServiceSymbol({
  kind,
}: {
  kind: 'day' | 'night' | 'grooming' | 'academy' | 'visit' | 'walk';
}) {
  if (kind === 'visit' || kind === 'walk')
    return (
      <svg className={`care-symbol care-symbol-${kind}`} viewBox="0 0 100 100" aria-hidden="true">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {kind === 'visit' ? (
            <>
              <path d="m16 44 34-28 34 28M24 38v44h52V38" />
              <path d="M50 68c-19-11-13-25-4-20l4 4 4-4c9-5 15 9-4 20Z" />
            </>
          ) : (
            <>
              <path d="M18 72h64M28 68V48l10-10 12 10h18l8 10v10M38 38V26l12 6v16M28 52l-10-8M40 58v10m22-10v10M50 32q20 0 20-16" />
              <circle cx="42" cy="34" r="1" />
            </>
          )}
        </g>
      </svg>
    );
  if (kind === 'day' || kind === 'night') return <CareSymbol kind={kind} />;
  return (
    <svg className={`care-symbol care-symbol-${kind}`} viewBox="0 0 100 100" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === 'grooming' ? (
          <>
            <g className="grooming-blade">
              <circle cx="30" cy="72" r="10" />
              <path d="m36 64 38-46" />
            </g>
            <g className="grooming-blade reverse">
              <circle cx="70" cy="72" r="10" />
              <path d="m64 64-38-46" />
            </g>
            <g className="grooming-tuft" strokeWidth="2">
              <path d="M44 15q-2 7 0 14" />
              <path d="M50 13q-2 8 0 16" />
              <path d="M56 15q-2 7 0 14" />
            </g>
            <circle cx="50" cy="48" r="3" />
            <path
              className="symbol-star"
              d="m87 37 1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5Z"
            />
          </>
        ) : (
          <>
            <g className="academy-book">
              <g className="academy-page-left">
                <path d="M50 30q-15-13-34-8v52q20-4 34 8Z" />
                <path className="academy-lines" pathLength="1" d="m25 36 15 5m-15 8 15 5" />
              </g>
              <g className="academy-page-right">
                <path d="M50 30q15-13 34-8v52q-20-4-34 8Z" />
                <path className="academy-lines" pathLength="1" d="m60 41 15-5m-15 18 15-5" />
              </g>
              <path className="academy-spine" d="M50 30v52" />
              <path
                className="academy-turning-page"
                d="M50 30q15-13 34-8v52q-20-4-34 8Z"
                fill="#faf8f2"
              />
            </g>
            <path className="symbol-star" d="m50 5 2 5 6 2-6 2-2 6-2-6-6-2 6-2Z" />
          </>
        )}
      </g>
    </svg>
  );
}
export function ServicesPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <section data-scroll-scene className="services service-guide">
      <div className="section-heading">
        <p className="eyebrow">{uiText('ui.marketingPages.careNewBeginnings')}</p>
        <h1>{uiText('ui.marketingPages.careForEveryChapter')}</h1>
        <p>{uiText('ui.marketingPages.fromDaysTogetherAndOvernightStaysToFreshCoats')}</p>
      </div>
      <div className="service-guide-grid">
        {serviceContent().map((service, index) => (
          <article key={service.id} id={service.id}>
            <div className="service-guide-art" data-icon-scene>
              <ServiceSymbol kind={service.kind} />
              <span>0{index + 1}</span>
            </div>
            <p className="cute-note">{service.tag}</p>
            <h2>{service.name}</h2>
            <p>{service.body}</p>
            <p className="service-detail">{service.note}</p>
            <a className="text-link" href={service.id === 'training' ? '/academy/' : '/pricing/'}>
              {service.id === 'training'
                ? uiText('ui.marketingPages.exploreTheAcademy')
                : uiText('ui.marketingPages.pricingUsefulDetails')}{' '}
              ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
export function PricingPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <>
      <section className="editorial-page pricing-page" data-scroll-scene>
        <p className="eyebrow">{uiText('ui.marketingPages.aLittleClarityBeforeYouPlan')}</p>
        <h1>{uiText('ui.marketingPages.goodPlansStartWithClarity')}</h1>
        <p className="page-lead">
          {marketingPreview
            ? uiText('ui.marketingPages.fromEverydayCareToANewCraftFindThe')
            : uiText('ui.marketingPages.ourServicePricesAndCourseFeesAreOnTheir')}
        </p>
        <div id="service-prices" className="price-list">
          {serviceContent().map((service, index) => (
            <article key={service.id}>
              <span className="row-number">0{index + 1}</span>
              <div>
                <h2>
                  {service.name}
                  {marketingPreview && (
                    <span className="preview-price">
                      {(previewPrices[service.id]
                        ? publicText(previewPrices[service.id])
                        : undefined) ?? uiText('ui.marketingPages.confirmPricing')}
                    </span>
                  )}
                </h2>
                <p>{marketingPreview ? service.body : service.note}</p>
              </div>
              <a
                className="text-link"
                href={service.id === 'training' ? '/academy/' : '/services/#' + service.id}
              >
                {uiText('ui.marketingPages.explore')} ↗
              </a>
            </article>
          ))}
        </div>
        <aside id="boarding-packages" className="package-note">
          <span className="cute-note">
            {uiText('ui.marketingPages.forALittleMoreTimeTogether')}
          </span>
          <h2>{uiText('ui.marketingPages.boardingPackages')}</h2>
          <p>
            {marketingPreview
              ? uiText('ui.marketingPages.thirtyDaysOfBoardingValidForThreeMonthsFrom')
              : uiText('ui.marketingPages.packagesInclude30DaysValidForThreeMonthsFrom')}
          </p>
        </aside>
      </section>
      <section
        className="editorial-page cancellation-section"
        id="cancellation-policy"
        data-scroll-scene
      >
        <p className="eyebrow">{uiText('ui.marketingPages.whenPlansChange')}</p>
        <h2>{uiText('ui.marketingPages.cancellationPolicy')}</h2>
        <p>{uiText('ui.marketingPages.theConfirmedBoardingCancellationTerms')}</p>
        <div className="policy-milestones">
          <article>
            <span className="policy-number">14</span>
            <h3>{uiText('ui.marketingPages.daysAhead')}</h3>
            <p>{uiText('ui.marketingPages.cancellationReceivesAFullRefund')}</p>
          </article>
          <article>
            <span className="policy-number">7</span>
            <h3>{uiText('ui.marketingPages.daysAhead2')}</h3>
            <p>{uiText('ui.marketingPages.cancellationReceivesAHalfRefund')}</p>
          </article>
        </div>
        <p className="policy-note">
          {marketingPreview
            ? uiText('ui.marketingPages.ifYourPlansChangeLetUsKnowAsSoon')
            : uiText('ui.marketingPages.exactDeadlinesShorterNoticeAndNoShowTermsAnd')}
        </p>
        <a className="text-link" href="/services/">
          {uiText('ui.marketingPages.exploreOurServices')} ↗
        </a>
      </section>
    </>
  );
}
export function ContactPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <section className="editorial-page contact-page" data-scroll-scene>
      <div className="contact-page-flower">
        <GardenBlossom />
      </div>
      <p className="eyebrow">{uiText('ui.marketingPages.everyGoodStoryStartsWithHello')}</p>
      <h1>{uiText('ui.marketingPages.letSTalkAboutYourLittleOne')}</h1>
      <p className="page-lead">{uiText('ui.marketingPages.tellUsAboutYourPetTheCareYouRe')}</p>
      {marketingPreview ? (
        <dl className="contact-details">
          <div>
            <dt>{uiText('ui.marketingPages.sayHello')}</dt>
            <dd>
              <a href="mailto:hello@niuniufamilypaws.example">hello@niuniufamilypaws.example</a>
            </dd>
          </div>
          <div>
            <dt>{uiText('ui.marketingPages.comeBy')}</dt>
            <dd>{uiText('ui.marketingPages.mondaySaturday9Am6PmVisitsByAppointment')}</dd>
          </div>
        </dl>
      ) : (
        <>
          <p className="contact-status">{t('pending')}</p>
          <p>{uiText('ui.marketingPages.ourPhoneEmailAndLocationsWillAppearHereOnce')}</p>
        </>
      )}
      <div className="contact-options">
        <a href="/services/">{uiText('ui.marketingPages.careForMyPet')} ↗</a>
        <a href="/academy/">{uiText('ui.marketingPages.learnToGroom')} ↗</a>
        <a href="/services/#prepare">{uiText('ui.marketingPages.prepareForAFirstVisit')} ↗</a>
      </div>
    </section>
  );
}
export function SpacesPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <section className="editorial-page spaces-page" data-scroll-scene>
      <p className="eyebrow">{uiText('ui.marketingPages.aLittleLookAround')}</p>
      <h1>{uiText('ui.marketingPages.roomForTheLittleThings')}</h1>
      <p className="page-lead">
        {marketingPreview
          ? uiText('ui.marketingPages.stepIntoThePlacesForEverydayCareFreshCoats')
          : uiText('ui.marketingPages.getToKnowOurCareHomesAndGroomingShop')}
      </p>
      <div className="space-previews">
        <article id="care-homes">
          <div className="space-illustration" aria-hidden="true">
            <svg viewBox="0 0 400 260">
              <path d="m50 120 150-100 150 100v120H50Z" fill="#dae4d2" />
              <path d="M155 240V135a45 45 0 0 1 90 0v105" fill="#f8f1df" />
              <path d="M80 143h45v45H80Zm195 0h45v45h-45Z" fill="#c4b28d" />
              <path d="M0 240q200-50 400 0v20H0" fill="#91af96" />
            </svg>
          </div>
          <p className="cute-note">{uiText('ui.marketingPages.aHomeAwayFeeling')}</p>
          <h2>{uiText('ui.marketingPages.ourCareHomes')}</h2>
          <p>
            {marketingPreview
              ? uiText('ui.marketingPages.familiarRoutinesAndQuietRestingCornersWithRoomFor')
              : uiText('ui.marketingPages.aCloserLookAtRoomsRestingAreasAndEveryday')}
          </p>
        </article>
        <article id="grooming-shop">
          <div className="space-illustration" aria-hidden="true">
            <ServiceSymbol kind="grooming" />
          </div>
          <p className="cute-note">{uiText('ui.marketingPages.aPlaceForALittlePolish')}</p>
          <h2>{uiText('ui.marketingPages.theGroomingShopEquipment')}</h2>
          <p>
            {marketingPreview
              ? uiText('ui.marketingPages.fromTheWashAreaToTheGroomingTableEvery')
              : uiText('ui.marketingPages.ourGalleryWillIntroduceGroomingStationsWashAreasTools')}
          </p>
        </article>
      </div>
      <div id="space-gallery">
        <PhotoGallery />
      </div>
      <a className="text-link" href="/services/#grooming">
        {uiText('ui.marketingPages.explorePetGrooming')} ↗
      </a>
    </section>
  );
}
export function AcademyPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const content = usePublicMarketingContent();
  return (
    <section className="editorial-page academy-page" data-scroll-scene>
      <p className="eyebrow">{uiText('ui.marketingPages.newHandsNewPossibilities')}</p>
      <h1>{uiText('ui.marketingPages.aLittleSparkANewCraft')}</h1>
      <p className="page-lead">
        {uiText('ui.marketingPages.trainingClassesForNewGroomersANewBeginningFor')}
      </p>
      <div className="academy-intro">
        <div className="academy-symbol">
          <ServiceSymbol kind="academy" />
        </div>
        <div>
          <p className="cute-note">{uiText('ui.marketingPages.everyExpertStartsSomewhere')}</p>
          <h2>{uiText('ui.marketingPages.yourLearningJourney')}</h2>
          <p>
            {marketingPreview
              ? uiText('ui.marketingPages.fourWeekendsInASmallLearningGroupExploringTool')
              : uiText(
                  'ui.marketingPages.courseContentInstructorIntroductionsEquipmentDatesAndFeesWill',
                )}
          </p>
          <a className="text-link" href="/contact/">
            {uiText('ui.marketingPages.stayInTouchAboutClasses')} ↗
          </a>
        </div>
      </div>
      <div id="academy-gallery">
        <PhotoGallery student />
      </div>
      <section className="student-stories">
        <p className="eyebrow">{uiText('ui.marketingPages.fromTheLearningRoom')}</p>
        <h2>{uiText('ui.marketingPages.smallStepsGrowingConfidence')}</h2>
        <p>
          {marketingPreview
            ? uiText('ui.marketingPages.fromTheFirstAttemptToALittleMoreConfidence')
            : uiText('ui.marketingPages.studentClassPhotosWorkAndFirstHandStoriesWill')}
        </p>
        <StoryQuotes stories={content.studentStories} student />
      </section>
      <a className="text-link" href="/pricing/">
        {uiText('ui.marketingPages.pricingUsefulDetails2')} ↗
      </a>
    </section>
  );
}
