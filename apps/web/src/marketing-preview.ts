import { localizedText } from './i18n.ts';
import type { PublicMarketingContent } from './public-marketing-content';

/** Owner-requested realistic mock content, restricted to the local development preview. */
export const marketingPreview =
  import.meta.env?.DEV === true &&
  typeof window !== 'undefined' &&
  ((location.hostname === 'localhost' && location.port === '4180') ||
    new URLSearchParams(location.search).get('preview') === 'sample');
export const previewPrices: Record<string, { en: string; zh: string }> = {
  daycare: localizedText('ui.marketingPreview.from45Day'),
  boarding: localizedText('ui.marketingPreview.from70Night'),
  grooming: localizedText('ui.marketingPreview.from65Visit'),
  training: localizedText('ui.marketingPreview.480BeginnerCourse'),
};
export const previewContent: PublicMarketingContent = {
  stats: {
    petsCaredFor: { value: 1280, asOf: '2026-11-01T00:00:00Z' },
    groomingAppointments: { value: 864, asOf: '2026-11-01T00:00:00Z' },
    groomersTrained: { value: 36, asOf: '2026-11-01T00:00:00Z' },
  },
  testimonials: [
    {
      quote: localizedText('ui.marketingPreview.fromHerFavouriteBlanketToQuietTimePoppyS'),
      attribution: localizedText('ui.marketingPreview.poppySFamily'),
    },
    {
      quote: localizedText('ui.marketingPreview.mapleCameHomeLookingLovelyTheThoughtfulCoatCare'),
      attribution: localizedText('ui.marketingPreview.mapleSFamily'),
    },
    {
      quote: localizedText('ui.marketingPreview.aGentleWelcomeACalmLittleCornerAndPeople'),
      attribution: localizedText('ui.marketingPreview.oliveSFamily'),
    },
  ],
  studentStories: [
    {
      quote: localizedText('ui.marketingPreview.breakingEachGroomIntoSmallThoughtfulStepsHelpedMe'),
      attribution: localizedText('ui.marketingPreview.jamieBeginnerGroomingClass'),
    },
    {
      quote: localizedText('ui.marketingPreview.iLeftWithAClearerRoutineForCoatPreparation'),
      attribution: localizedText('ui.marketingPreview.alexBeginnerGroomingClass'),
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
