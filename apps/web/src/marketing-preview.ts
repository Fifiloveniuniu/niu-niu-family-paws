import type { PublicMarketingContent } from './public-marketing-content';

/** Owner-requested realistic mock content, restricted to the local development preview. */
export const marketingPreview =
  import.meta.env?.DEV === true &&
  typeof window !== 'undefined' &&
  ((location.hostname === 'localhost' && location.port === '4180') ||
    new URLSearchParams(location.search).get('preview') === 'sample');
export const previewPrices: Record<string, { en: string; zh: string }> = {
  daycare: { en: 'From $45 / day', zh: '$45 / 天起' },
  boarding: { en: 'From $70 / night', zh: '$70 / 晚起' },
  grooming: { en: 'From $65 / visit', zh: '$65 / 次起' },
  training: { en: '$480 / beginner course', zh: '新手课程 $480' },
};
export const previewContent: PublicMarketingContent = {
  stats: {
    petsCaredFor: { value: 1280, asOf: '2026-11-01T00:00:00Z' },
    groomingAppointments: { value: 864, asOf: '2026-11-01T00:00:00Z' },
    groomersTrained: { value: 36, asOf: '2026-11-01T00:00:00Z' },
  },
  testimonials: [
    {
      quote: {
        en: 'From her favourite blanket to quiet time, Poppy’s little routines made her stay feel familiar.',
        zh: '从小毯子到安静休息的时间，Poppy 的日常习惯都被记住，让寄养多了一份熟悉与安心。',
      },
      attribution: { en: 'Poppy’s family', zh: 'Poppy 的家人' },
    },
    {
      quote: {
        en: 'Maple came home looking lovely. The thoughtful coat-care tips made our next brushing session so much easier.',
        zh: 'Maple 美美容容地回家了。贴心的毛发护理建议，也让我们下一次在家梳毛轻松了许多。',
      },
      attribution: { en: 'Maple’s family', zh: 'Maple 的家人' },
    },
    {
      quote: {
        en: 'A gentle welcome, a calm little corner, and people who wanted to understand our cat’s personality. That made all the difference.',
        zh: '温柔的欢迎、安静的小角落，还有愿意了解猫咪个性的人。正是这些小事，让我们感到安心。',
      },
      attribution: { en: 'Olive’s family', zh: 'Olive 的家人' },
    },
  ],
  studentStories: [
    {
      quote: {
        en: 'Breaking each groom into small, thoughtful steps helped me build confidence with the tools and the pets in front of me.',
        zh: '把每一次美容拆解成细致的小步骤，让我面对工具和眼前的小动物时，都更有信心了。',
      },
      attribution: { en: 'Jamie · beginner grooming class', zh: 'Jamie · 新手美容课堂' },
    },
    {
      quote: {
        en: 'I left with a clearer routine for coat preparation and a much better eye for the little finishing details.',
        zh: '我学会了更清晰的毛发准备流程，也更懂得留意那些让造型更完整的小细节。',
      },
      attribution: { en: 'Alex · beginner grooming class', zh: 'Alex · 新手美容课堂' },
    },
  ],
  spacePhotos: [],
  studentPhotos: [],
};
export const previewMessages = {
  en: {
    price: 'See Pricing for care, grooming, and academy options.',
    pending: 'Say hello to our team',
    contactBody:
      'Visit our care homes and grooming studio by appointment, or say hello to plan your pet’s next chapter.',
    homeContactBody:
      'Daycare, overnight care, a fresh coat, or a new craft. Tell us what you have in mind and let’s find your next step.',
    a1: 'Tell us about your pet and your preferred dates. We’ll talk through their routine, confirm availability, and help you prepare for their visit.',
    a2: 'Explore Pricing for daycare, boarding, grooming and beginner grooming classes. A final quote reflects your pet’s needs and the service you choose.',
    a8: 'Yes. Our beginner grooming course introduces coat preparation, safe tool handling and finishing skills across four weekends.',
    a5: 'Our Pricing page explains cancellation terms. Talk to us as soon as your plans change so we can help with the next step.',
  },
  zh: {
    price: '在价格页面了解照护、美容及课堂选择。',
    pending: '和我们打个招呼',
    contactBody: '照护家庭与美容工作室采取预约来访，欢迎联系我们，一起安排宠物的下一段故事。',
    homeContactBody:
      '日间陪伴、过夜照护、清爽美容，或是学习一门新手艺。告诉我们你的想法，一起找到下一步。',
    a1: '告诉我们宠物的情况与希望安排的日期。我们会沟通日常习惯、确认空位，并帮助你准备第一次来访。',
    a2: '价格页面提供日间托管、寄养、美容及新手课堂信息。最终报价将结合宠物的需求与所选服务确认。',
    a8: '可以。四个周末的新手课程涵盖毛发准备、工具使用与基础修饰技巧。',
    a5: '价格页面提供取消条款。行程变化时，请尽早与我们沟通，一起安排下一步。',
  },
};
