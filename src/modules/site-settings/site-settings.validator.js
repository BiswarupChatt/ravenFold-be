import {
  assertArrayField,
  assertBooleanField,
  assertNoUnknownKeys,
  assertObjectField,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const siteSettingsFields = [
  'brandName',
  'contact',
  'copyrightText',
  'favicon',
  'featureFlags',
  'logo',
  'seo',
  'socialLinks',
];

const imageFields = ['alt', 'publicId', 'url'];
const contactFields = ['businessHours', 'supportEmail', 'supportPhone', 'whatsappNumber'];
const seoFields = ['description', 'title'];
const featureFlagFields = ['enableReviews', 'enableWishlist', 'maintenanceMode', 'showBlog', 'showNavbarSearch'];
const socialLinkFields = ['isActive', 'label', 'url'];

const validateImageAsset = (payload, field) => {
  if (!Object.prototype.hasOwnProperty.call(payload, field) || payload[field] === null) {
    return;
  }

  assertObjectField(payload, field);
  assertNoUnknownKeys(payload[field], imageFields, `body.${field}`);
  imageFields.forEach((imageField) => assertStringLikeField(payload[field], imageField, `body.${field}`));
};

const updateSiteSettingsSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, siteSettingsFields);
  ['brandName', 'copyrightText'].forEach((field) => assertStringLikeField(payload, field));

  validateImageAsset(payload, 'logo');
  validateImageAsset(payload, 'favicon');

  if (Object.prototype.hasOwnProperty.call(payload, 'contact')) {
    assertObjectField(payload, 'contact');
    assertNoUnknownKeys(payload.contact, contactFields, 'body.contact');
    contactFields.forEach((field) => assertStringLikeField(payload.contact, field, 'body.contact'));
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'seo')) {
    assertObjectField(payload, 'seo');
    assertNoUnknownKeys(payload.seo, seoFields, 'body.seo');
    seoFields.forEach((field) => assertStringLikeField(payload.seo, field, 'body.seo'));
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'featureFlags')) {
    assertObjectField(payload, 'featureFlags');
    assertNoUnknownKeys(payload.featureFlags, featureFlagFields, 'body.featureFlags');
    featureFlagFields.forEach((field) => assertBooleanField(payload.featureFlags, field, 'body.featureFlags'));
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'socialLinks')) {
    assertArrayField(payload, 'socialLinks');
    payload.socialLinks.forEach((link, index) => {
      const field = `body.socialLinks[${index}]`;
      const socialLink = expectObject(link, field);

      assertNoUnknownKeys(socialLink, socialLinkFields, field);
      ['label', 'url'].forEach((key) => assertStringLikeField(socialLink, key, field));
      assertBooleanField(socialLink, 'isActive', field);
    });
  }

  return pickAllowedKeys(payload, siteSettingsFields);
});

export { updateSiteSettingsSchema };
