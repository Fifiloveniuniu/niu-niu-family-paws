import { marketingPreview, previewPrices } from './marketing-preview';
import { PhotoGallery, StoryQuotes } from './marketing-galleries';
import { usePublicMarketingContent } from './public-marketing-content';
import { useTranslation } from 'react-i18next';
import { CareSymbol } from './story-landscape';
import { GardenBlossom } from './garden-art';

export function serviceContent(zh: boolean) {
  const services = zh
    ? [
        {
          id: 'daycare',
          name: '日间托管',
          tag: '快乐的一天',
          body: '白天需要照顾宠物？告诉我们它的日常习惯，一起讨论适合的安排。',
          note: '请先确认日期、照护需求及接送安排。',
          kind: 'day' as const,
        },
        {
          id: 'boarding',
          name: '宠物寄养',
          tag: '安心的一段时光',
          body: '计划外出过夜？让熟悉的饮食、休息和生活节奏成为照护的起点。',
          note: '请先确认空位、照护安排和取消条款。',
          kind: 'night' as const,
        },
        {
          id: 'grooming',
          name: '宠物美容',
          tag: '清爽可爱，刚刚好',
          body: '从了解毛发状况和美容习惯开始，一起讨论适合宠物的护理需求。',
          note: '具体项目、适用宠物、价格及可预约时间请先确认。',
          kind: 'grooming' as const,
        },
        {
          id: 'training',
          name: '美容师成长课堂',
          tag: '每一剪，都是成长',
          body: '面向新手美容师的培训课程，让对宠物的喜爱成为新的学习起点。',
          note: '课程内容、时间、费用及报名信息待公布。',
          kind: 'academy' as const,
        },
      ]
    : [
        {
          id: 'daycare',
          name: 'Daycare',
          tag: 'A good little day',
          body: 'Care for the hours you’re away, beginning with a conversation about their familiar routine.',
          note: 'Confirm dates, care needs, and drop-off arrangements before a visit.',
          kind: 'day' as const,
        },
        {
          id: 'boarding',
          name: 'Boarding',
          tag: 'A home-away kind of stay',
          body: 'An overnight stay starts with the little things: mealtimes, resting spots, and what helps them settle.',
          note: 'Confirm availability, care arrangements, and cancellation terms before booking.',
          kind: 'night' as const,
        },
        {
          id: 'grooming',
          name: 'Pet grooming',
          tag: 'A little freshen-up',
          body: 'A fresh chapter for their coat. Tell us about their grooming routine and the care you have in mind.',
          note: 'Confirm treatments, suitability, prices, and appointment availability with us.',
          kind: 'grooming' as const,
        },
        {
          id: 'training',
          name: 'Grooming Academy',
          tag: 'Small steps. Skilled hands.',
          body: 'Training classes for new groomers, for the beginning of a new craft and a new story.',
          note: 'Course content, dates, fees, and enrolment details are coming soon.',
          kind: 'academy' as const,
        },
      ];
  return marketingPreview
    ? services.map((service) => ({
        ...service,
        note:
          previewPrices[service.id][zh ? 'zh' : 'en'] +
          (zh ? ' · 一起确认最适合的安排。' : ' · Let’s find the right arrangement together.'),
      }))
    : services;
}
export function ServiceSymbol({ kind }: { kind: 'day' | 'night' | 'grooming' | 'academy' }) {
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
        <p className="eyebrow">{zh ? '照顾与成长' : 'CARE & NEW BEGINNINGS'}</p>
        <h1>{zh ? '每一阶段，用心陪伴。' : 'Care for every chapter.'}</h1>
        <p>
          {zh
            ? '从日常照护到清爽美容，再到新手美容师的学习之旅。'
            : 'From days together and overnight stays to fresh coats and the start of a new craft.'}
        </p>
      </div>
      <div className="service-guide-grid">
        {serviceContent(zh).map((service, index) => (
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
                ? zh
                  ? '走进课堂'
                  : 'Explore the academy'
                : zh
                  ? '了解价格与条款'
                  : 'Pricing & useful details'}{' '}
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
        <p className="eyebrow">{zh ? '先了解，再安排' : 'A LITTLE CLARITY, BEFORE YOU PLAN'}</p>
        <h1>{zh ? '清楚的价格，安心的计划。' : 'Good plans start with clarity.'}</h1>
        <p className="page-lead">
          {marketingPreview
            ? zh
              ? '从日常照护到新的学习起点，找到适合你的安排。'
              : 'From everyday care to a new craft, find the arrangement that fits your next chapter.'
            : zh
              ? '服务价格与课程费用即将公布。请在确认安排前，先了解适用价格及完整条款。'
              : 'Our service prices and course fees are on their way. Confirm a quote and the complete terms before making arrangements.'}
        </p>
        <div id="service-prices" className="price-list">
          {serviceContent(zh).map((service, index) => (
            <article key={service.id}>
              <span className="row-number">0{index + 1}</span>
              <div>
                <h2>
                  {service.name}
                  {marketingPreview && (
                    <span className="preview-price">
                      {previewPrices[service.id][zh ? 'zh' : 'en']}
                    </span>
                  )}
                </h2>
                <p>{marketingPreview ? service.body : service.note}</p>
              </div>
              <a
                className="text-link"
                href={service.id === 'training' ? '/academy/' : '/services/#' + service.id}
              >
                {zh ? '了解服务' : 'Explore'} ↗
              </a>
            </article>
          ))}
        </div>
        <aside id="boarding-packages" className="package-note">
          <span className="cute-note">
            {zh ? '为更长的陪伴' : 'For a little more time together'}
          </span>
          <h2>{zh ? '寄养套餐' : 'Boarding packages'}</h2>
          <p>
            {marketingPreview
              ? zh
                ? '30 天寄养套餐，从首次使用起有效三个月。根据宠物类型与体重区间，一起选择合适的套餐。'
                : 'Thirty days of boarding, valid for three months from first use. We’ll help you choose a package for your pet’s type and weight band.'
              : zh
                ? '套餐包含 30 天，从首次使用起有效三个月。价格按宠物类型与体重区间确定，具体价格与完整使用条款待公布。'
                : 'Packages include 30 days, valid for three months from first use. Prices depend on pet type and weight band. Actual prices and complete usage terms will be published once confirmed.'}
          </p>
        </aside>
      </section>
      <section
        className="editorial-page cancellation-section"
        id="cancellation-policy"
        data-scroll-scene
      >
        <p className="eyebrow">{zh ? '计划有变时' : 'WHEN PLANS CHANGE'}</p>
        <h2>{zh ? '取消政策' : 'Cancellation policy'}</h2>
        <p>{zh ? '以下是已确认的寄养取消条款。' : 'The confirmed boarding cancellation terms.'}</p>
        <div className="policy-milestones">
          <article>
            <span className="policy-number">14</span>
            <h3>{zh ? '提前 14 天' : 'days ahead'}</h3>
            <p>{zh ? '取消可获得全额返还。' : 'Cancellation receives a full refund.'}</p>
          </article>
          <article>
            <span className="policy-number">7</span>
            <h3>{zh ? '提前 7 天' : 'days ahead'}</h3>
            <p>{zh ? '取消可获得一半返还。' : 'Cancellation receives a half refund.'}</p>
          </article>
        </div>
        <p className="policy-note">
          {marketingPreview
            ? zh
              ? '行程有变化，请尽早与我们联系。我们会一起核对预约安排与适用条款。'
              : 'If your plans change, let us know as soon as you can. We’ll review your arrangement and the applicable terms together.'
            : zh
              ? '具体截止时间、少于 7 天或未到店的处理方式，以及返还形式尚待确认。预约前请确认完整条款；目前网站尚未开放实际付费预约。'
              : 'Exact deadlines, shorter-notice and no-show terms, and the form of refund are still to be confirmed. Please confirm the complete terms before booking; paid bookings are not available through this website yet.'}
        </p>
        <a className="text-link" href="/services/">
          {zh ? '查看服务项目' : 'Explore our services'} ↗
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
      <p className="eyebrow">{zh ? '一声你好，故事开始' : 'EVERY GOOD STORY STARTS WITH HELLO'}</p>
      <h1>{zh ? '一起聊聊你的小宝贝。' : 'Let’s talk about your little one.'}</h1>
      <p className="page-lead">
        {zh
          ? '告诉我们宠物的日常、希望安排的服务，或你想了解的美容课程。'
          : 'Tell us about your pet, the care you’re planning, or the grooming classes you’d like to explore.'}
      </p>
      {marketingPreview ? (
        <dl className="contact-details">
          <div>
            <dt>{zh ? '聊聊你的计划' : 'Say hello'}</dt>
            <dd>
              <a href="mailto:hello@niuniufamilypaws.example">hello@niuniufamilypaws.example</a>
            </dd>
          </div>
          <div>
            <dt>{zh ? '欢迎来访' : 'Come by'}</dt>
            <dd>
              {zh
                ? '周一至周六 · 上午 9 点至下午 6 点，预约到访。'
                : 'Monday–Saturday · 9 am–6 pm. Visits by appointment.'}
            </dd>
          </div>
        </dl>
      ) : (
        <>
          <p className="contact-status">{t('pending')}</p>
          <p>
            {zh
              ? '电话、邮箱及地址将在确认后公布。'
              : 'Our phone, email, and locations will appear here once confirmed.'}
          </p>
        </>
      )}
      <div className="contact-options">
        <a href="/services/">{zh ? '为宠物寻找照顾' : 'Care for my pet'} ↗</a>
        <a href="/academy/">{zh ? '了解美容师课程' : 'Learn to groom'} ↗</a>
        <a href="/services/#prepare">{zh ? '准备第一次来访' : 'Prepare for a first visit'} ↗</a>
      </div>
    </section>
  );
}
export function SpacesPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <section className="editorial-page spaces-page" data-scroll-scene>
      <p className="eyebrow">{zh ? '欢迎走进我们的小天地' : 'A LITTLE LOOK AROUND'}</p>
      <h1>{zh ? '照顾发生的地方。' : 'Room for the little things.'}</h1>
      <p className="page-lead">
        {marketingPreview
          ? zh
            ? '走进照护家庭与美容店，看看日常陪伴、毛发护理与学习发生的地方。'
            : 'Step into the places for everyday care, fresh coats and learning something new.'
          : zh
            ? '了解我们的照护家庭与宠物美容店。真实空间、设备与地址照片即将更新。'
            : 'Get to know our care homes and grooming shop. Our own space, equipment, and location galleries are being prepared.'}
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
          <p className="cute-note">{zh ? '日常的小温暖' : 'A home-away feeling'}</p>
          <h2>{zh ? '照护家庭' : 'Our care homes'}</h2>
          <p>
            {marketingPreview
              ? zh
                ? '熟悉的日常、安静的休息角落，让每一次陪伴都有自己的节奏。'
                : 'Familiar routines and quiet resting corners, with room for each pet’s own rhythm.'
              : zh
                ? '即将分享房间、休息区域和日常照顾空间的真实照片。'
                : 'A closer look at rooms, resting areas, and everyday care spaces is coming soon.'}
          </p>
        </article>
        <article id="grooming-shop">
          <div className="space-illustration" aria-hidden="true">
            <ServiceSymbol kind="grooming" />
          </div>
          <p className="cute-note">{zh ? '用心打理每一剪' : 'A place for a little polish'}</p>
          <h2>{zh ? '美容店与设备' : 'The grooming shop & equipment'}</h2>
          <p>
            {marketingPreview
              ? zh
                ? '从清洁区域到美容台，再到细致的工具准备，每一步都从照顾小细节开始。'
                : 'From the wash area to the grooming table, every stage begins with thoughtful preparation and the right tools.'
              : zh
                ? '即将展示美容台、清洁区域、工具和学习环境。具体设施以真实图集为准。'
                : 'Our gallery will introduce grooming stations, wash areas, tools, and the learning environment.'}
          </p>
        </article>
      </div>
      <div id="space-gallery">
        <PhotoGallery />
      </div>
      <a className="text-link" href="/services/#grooming">
        {zh ? '了解宠物美容' : 'Explore pet grooming'} ↗
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
      <p className="eyebrow">{zh ? '新的手艺，新的开始' : 'NEW HANDS. NEW POSSIBILITIES.'}</p>
      <h1>{zh ? '每一剪，都是成长。' : 'A little spark. A new craft.'}</h1>
      <p className="page-lead">
        {zh
          ? '面向新手美容师的培训课程。在热爱宠物的路上，开启新的学习之旅。'
          : 'Training classes for new groomers. A new beginning for people who love pets and want to learn the craft.'}
      </p>
      <div className="academy-intro">
        <div className="academy-symbol">
          <ServiceSymbol kind="academy" />
        </div>
        <div>
          <p className="cute-note">{zh ? '从第一步开始' : 'Every expert starts somewhere'}</p>
          <h2>{zh ? '你的学习之旅' : 'Your learning journey'}</h2>
          <p>
            {marketingPreview
              ? zh
                ? '四个周末的小班课程，从安全使用工具、毛发准备与清洗，到基础修饰与造型练习，一步步建立信心。'
                : 'Four weekends in a small learning group, exploring tool handling, coat preparation, bathing and foundational finishing—one thoughtful step at a time.'
              : zh
                ? '课程内容、师资介绍、所用设备、时间安排与学费将在确认后公布。请先了解完整课程信息，再决定报名。'
                : 'Course content, instructor introductions, equipment, dates, and fees will be shared once confirmed. Review the complete course information before enrolling.'}
          </p>
          <a className="text-link" href="/contact/">
            {zh ? '关注课程信息' : 'Stay in touch about classes'} ↗
          </a>
        </div>
      </div>
      <div id="academy-gallery">
        <PhotoGallery student />
      </div>
      <section className="student-stories">
        <p className="eyebrow">{zh ? '从课堂出发' : 'FROM THE LEARNING ROOM'}</p>
        <h2>{zh ? '小小进步，大大可能。' : 'Small steps. Growing confidence.'}</h2>
        <p>
          {marketingPreview
            ? zh
              ? '从第一次尝试，到更有信心地完成每一个步骤。'
              : 'From the first attempt to a little more confidence with every step.'
            : zh
              ? '学员课堂照片、作品与获准分享的真实学习故事即将更新。'
              : 'Student class photos, work, and first-hand stories will be shared here with their permission.'}
        </p>
        <StoryQuotes stories={content.studentStories} student />
      </section>
      <a className="text-link" href="/pricing/">
        {zh ? '价格与实用信息' : 'Pricing & useful details'} ↗
      </a>
    </section>
  );
}
