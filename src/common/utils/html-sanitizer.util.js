import sanitizeHtml from 'sanitize-html';

const ALIGNMENT_CLASSES = new Set([
  'align-center',
  'align-left',
  'align-right',
  'align-justify',
]);

const allowedHtmlTags = [
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
];

const allowedHtmlAttributes = {
  a: ['href', 'target', 'rel'],
  div: ['class'],
  h1: ['class'],
  h2: ['class'],
  h3: ['class'],
  li: ['class'],
  p: ['class'],
  span: ['class'],
};

const normalizeClassValue = (className = '') => (
  String(className)
    .split(/\s+/)
    .filter((item) => ALIGNMENT_CLASSES.has(item))
    .join(' ')
);

const isExternalUrl = (href = '') => /^https?:\/\//i.test(href);

const sanitizePolicyHtml = (html = '') => sanitizeHtml(String(html || ''), {
  allowedTags: allowedHtmlTags,
  allowedAttributes: allowedHtmlAttributes,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
  parseStyleAttributes: false,
  transformTags: {
    a: (tagName, attribs = {}) => {
      const href = String(attribs.href || '').trim();

      if (!href) {
        return {
          tagName: 'span',
          attribs: {},
        };
      }

      return {
        tagName,
        attribs: {
          href,
          ...(isExternalUrl(href)
            ? {
              rel: 'noopener noreferrer',
              target: '_blank',
            }
            : {}),
        },
      };
    },
    div: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    h1: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    h2: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    h3: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    li: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    p: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
    span: (tagName, attribs = {}) => ({
      tagName,
      attribs: {
        ...(normalizeClassValue(attribs.class) ? { class: normalizeClassValue(attribs.class) } : {}),
      },
    }),
  },
});

const extractPlainTextFromHtml = (html = '') => (
  sanitizeHtml(String(html || ''), {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text.replace(/\s+/g, ' '),
  }).trim()
);

const isHtmlContentEmpty = (html = '') => !extractPlainTextFromHtml(html);

export {
  allowedHtmlAttributes,
  allowedHtmlTags,
  extractPlainTextFromHtml,
  isHtmlContentEmpty,
  sanitizePolicyHtml,
};

export default {
  allowedHtmlAttributes,
  allowedHtmlTags,
  extractPlainTextFromHtml,
  isHtmlContentEmpty,
  sanitizePolicyHtml,
};
