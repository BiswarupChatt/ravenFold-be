import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import StorefrontPage from '@/modules/storefront-page/models/storefront-page.model.js';

const HOME_PAGE_SLUG = 'home';

const defaultHomeContent = {
  finalCta: {
    buttonLabel: 'Shop Raven Fold',
    buttonUrl: '/shop',
    isActive: true,
    title: 'Find your next everyday carry.',
  },
  hero: {
    backgroundImageUrl: '',
    eyebrow: 'New Raven Fold arrivals',
    isActive: true,
    primaryCtaLabel: 'Shop collection',
    primaryCtaUrl: '/shop',
    secondaryCtaLabel: 'Need help?',
    secondaryCtaUrl: '/contacts',
    subtitle: 'Bags, wallets, and travel goods designed for cleaner everyday movement.',
    title: 'Fresh carry arrivals',
  },
  productSection: {
    buttonLabel: 'View all products',
    buttonUrl: '/shop',
    eyebrow: 'All Product Shop',
    isActive: true,
    productLimit: 4,
    tabLabel: 'New Arrivals',
    title: 'Favorite carry products',
  },
  promoStrip: {
    isActive: true,
    items: [
      'Launch offers on selected pieces',
      'Secure checkout',
      'Delivery tracking',
      'GST invoice support',
      'WhatsApp support',
    ],
  },
  supportCards: {
    isActive: true,
    items: [
      {
        description: 'Encrypted payments with order confirmation after checkout.',
        icon: 'shield',
        title: 'Secure checkout',
      },
      {
        description: 'Shipment updates with tracking details when your order moves.',
        icon: 'shipping',
        title: 'Delivery tracking',
      },
      {
        description: 'Invoice help for business purchases and eligible requests.',
        icon: 'invoice',
        title: 'GST invoice support',
      },
      {
        description: 'Reach the Raven Fold team for product and order questions.',
        icon: 'support',
        title: 'Support online',
      },
    ],
  },
  testimonial: {
    author: 'Raven Fold customer',
    isActive: true,
    quote: 'The wallet feels compact, the finish looks premium, and the packaging made it feel ready to gift.',
    rating: 5,
  },
  sections: [
    { id: 'hero', isActive: true, sortOrder: 0, type: 'hero' },
    { id: 'promoStrip', isActive: true, sortOrder: 1, type: 'promoStrip' },
    { id: 'productSection', isActive: true, sortOrder: 2, type: 'productSection' },
    { id: 'testimonial', isActive: true, sortOrder: 3, type: 'testimonial' },
    { id: 'supportCards', isActive: true, sortOrder: 4, type: 'supportCards' },
    { id: 'finalCta', isActive: true, sortOrder: 5, type: 'finalCta' },
  ],
};

const homeSectionTypes = defaultHomeContent.sections.map((section) => section.type);

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) throw new Error('Missing actor id');
    return normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }
};

const normalizeBoolean = (value, fallback = true) => (
  typeof value === 'boolean' ? value : fallback
);

const normalizeStringArray = (value, fallback = []) => (
  Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean)
    : fallback
);

const normalizeHomeSections = (content = {}) => {
  const rawSections = Array.isArray(content.sections) ? content.sections : [];
  const sectionByType = new Map(
    rawSections
      .map((section, index) => {
        const type = normalizeText(section?.type || section?.id);

        if (!homeSectionTypes.includes(type)) {
          return null;
        }

        return [
          type,
          {
            id: normalizeText(section?.id) || type,
            isActive: normalizeBoolean(section?.isActive, content[type]?.isActive !== false),
            sortOrder: Number.isInteger(Number(section?.sortOrder)) ? Number(section.sortOrder) : index,
            type,
          },
        ];
      })
      .filter(Boolean),
  );

  return homeSectionTypes
    .map((type, index) => (
      sectionByType.get(type) || {
        id: type,
        isActive: content[type]?.isActive !== false,
        sortOrder: rawSections.length + index,
        type,
      }
    ))
    .sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0))
    .map((section, index) => ({ ...section, sortOrder: index }));
};

const normalizeHomeContent = (content = {}) => ({
  finalCta: {
    buttonLabel: normalizeText(content.finalCta?.buttonLabel) || defaultHomeContent.finalCta.buttonLabel,
    buttonUrl: normalizeText(content.finalCta?.buttonUrl) || defaultHomeContent.finalCta.buttonUrl,
    isActive: normalizeBoolean(content.finalCta?.isActive, true),
    title: normalizeText(content.finalCta?.title) || defaultHomeContent.finalCta.title,
  },
  hero: {
    backgroundImageUrl: normalizeText(content.hero?.backgroundImageUrl),
    eyebrow: normalizeText(content.hero?.eyebrow) || defaultHomeContent.hero.eyebrow,
    isActive: normalizeBoolean(content.hero?.isActive, true),
    primaryCtaLabel: normalizeText(content.hero?.primaryCtaLabel) || defaultHomeContent.hero.primaryCtaLabel,
    primaryCtaUrl: normalizeText(content.hero?.primaryCtaUrl) || defaultHomeContent.hero.primaryCtaUrl,
    secondaryCtaLabel: normalizeText(content.hero?.secondaryCtaLabel) || defaultHomeContent.hero.secondaryCtaLabel,
    secondaryCtaUrl: normalizeText(content.hero?.secondaryCtaUrl) || defaultHomeContent.hero.secondaryCtaUrl,
    subtitle: normalizeText(content.hero?.subtitle) || defaultHomeContent.hero.subtitle,
    title: normalizeText(content.hero?.title) || defaultHomeContent.hero.title,
  },
  productSection: {
    buttonLabel: normalizeText(content.productSection?.buttonLabel) || defaultHomeContent.productSection.buttonLabel,
    buttonUrl: normalizeText(content.productSection?.buttonUrl) || defaultHomeContent.productSection.buttonUrl,
    eyebrow: normalizeText(content.productSection?.eyebrow) || defaultHomeContent.productSection.eyebrow,
    isActive: normalizeBoolean(content.productSection?.isActive, true),
    productLimit: Number.isInteger(Number(content.productSection?.productLimit))
      ? Math.min(Math.max(Number(content.productSection.productLimit), 1), 12)
      : defaultHomeContent.productSection.productLimit,
    tabLabel: normalizeText(content.productSection?.tabLabel) || defaultHomeContent.productSection.tabLabel,
    title: normalizeText(content.productSection?.title) || defaultHomeContent.productSection.title,
  },
  promoStrip: {
    isActive: normalizeBoolean(content.promoStrip?.isActive, true),
    items: normalizeStringArray(content.promoStrip?.items, defaultHomeContent.promoStrip.items),
  },
  supportCards: {
    isActive: normalizeBoolean(content.supportCards?.isActive, true),
    items: Array.isArray(content.supportCards?.items)
      ? content.supportCards.items
        .map((item) => ({
          description: normalizeText(item?.description),
          icon: normalizeText(item?.icon) || 'shield',
          title: normalizeText(item?.title),
        }))
        .filter((item) => item.title || item.description)
        .slice(0, 8)
      : defaultHomeContent.supportCards.items,
  },
  testimonial: {
    author: normalizeText(content.testimonial?.author) || defaultHomeContent.testimonial.author,
    isActive: normalizeBoolean(content.testimonial?.isActive, true),
    quote: normalizeText(content.testimonial?.quote) || defaultHomeContent.testimonial.quote,
    rating: Math.min(Math.max(Number(content.testimonial?.rating || 5), 0), 5),
  },
  sections: normalizeHomeSections(content),
});

const formatStorefrontPage = (page = {}) => ({
  id: page.id || page._id?.toString?.() || '',
  content: normalizeHomeContent(page.content),
  slug: page.slug || HOME_PAGE_SLUG,
  status: page.status || 'published',
  title: page.title || 'Homepage',
  updatedAt: page.updatedAt || null,
});

const getOrCreateHomePage = async () => {
  assertDatabaseReady();

  return StorefrontPage.findOneAndUpdate(
    { slug: HOME_PAGE_SLUG },
    {
      $setOnInsert: {
        content: defaultHomeContent,
        slug: HOME_PAGE_SLUG,
        status: 'published',
        title: 'Homepage',
      },
    },
    { new: true, upsert: true },
  ).exec();
};

const getPublicHomePage = async () => {
  const page = await getOrCreateHomePage();
  return formatStorefrontPage(page.toObject());
};

const getAdminHomePage = async () => {
  const page = await getOrCreateHomePage();
  return formatStorefrontPage(page.toObject());
};

const updateAdminHomePage = async (actor, payload = {}) => {
  const actorId = normalizeUserId(actor);
  const page = await getOrCreateHomePage();

  page.content = normalizeHomeContent(payload.content || payload);
  page.status = ['draft', 'published'].includes(payload.status) ? payload.status : 'published';
  page.title = normalizeText(payload.title) || 'Homepage';
  page.updatedBy = actorId;
  await page.save();

  return formatStorefrontPage(page.toObject());
};

export {
  defaultHomeContent,
  getAdminHomePage,
  getPublicHomePage,
  normalizeHomeContent,
  updateAdminHomePage,
};

export default {
  defaultHomeContent,
  getAdminHomePage,
  getPublicHomePage,
  normalizeHomeContent,
  updateAdminHomePage,
};
