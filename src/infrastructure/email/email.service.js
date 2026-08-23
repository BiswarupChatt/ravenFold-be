import ApiError from '@/common/errors/api.error.js';
import logger from '@/common/logger/logger.js';
import {
  emailFromAddress,
  emailFromName,
  emailProvider,
  emailReplyToAddress,
  emailReplyToName,
  emailRequestTimeoutMs,
  contactSupportEmail,
  frontendUrl,
  zeptoMailApiUrl,
  zeptoMailSendToken,
} from '@/config/env.config.js';

const EMAIL_PROVIDERS = Object.freeze({
  LOG: 'log',
  ZEPTO_MAIL: 'zeptomail',
});

const normalizeText = (value) => String(value || '').trim();

const normalizeEmailAddress = (value, field = 'email') => {
  const email = normalizeText(value).toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, `${field} must be a valid email address`);
  }

  return email;
};

const escapeHtml = (value = '') => normalizeText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getResetPasswordUrl = (token) => {
  const baseUrl = normalizeText(frontendUrl).replace(/\/$/, '');

  if (!baseUrl || baseUrl === '*') {
    return '';
  }

  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const formatCurrency = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      currency: currency || 'INR',
      style: 'currency',
    }).format(Number(value || 0));
  } catch {
    return `${currency || 'INR'} ${Number(value || 0).toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const formatLabel = (value = '') => normalizeText(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const getCustomerName = ({ order = {}, user = null } = {}) => (
  user?.name
  || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
  || order.shippingAddress?.fullName
  || order.billingAddress?.fullName
  || 'Customer'
);

const getCustomerEmail = ({ order = {}, user = null } = {}) => (
  normalizeText(user?.email)
  || normalizeText(order.customerGstDetails?.email)
  || normalizeText(order.customerSnapshot?.email)
);

const getOrderDetailsUrl = (order) => {
  const baseUrl = normalizeText(frontendUrl).replace(/\/$/, '');

  if (!baseUrl || baseUrl === '*') {
    return '';
  }

  return `${baseUrl}/profile/order?orderId=${encodeURIComponent(order._id?.toString?.() || order.id || '')}`;
};

const getShipmentTrackingId = (shipment = {}) => (
  normalizeText(shipment.awbCode)
  || normalizeText(shipment.providerShipmentId)
  || normalizeText(shipment.providerOrderId)
);

const getShipmentLifecycleStatus = (status = '') => {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (['picked_up', 'in_transit'].includes(normalizedStatus)) {
    return 'shipped';
  }

  if (normalizedStatus === 'out_for_delivery') {
    return 'out_for_delivery';
  }

  if (normalizedStatus === 'delivered') {
    return 'delivered';
  }

  return '';
};

const getOrderEmailBase = ({ order = {}, user = null }) => ({
  currency: order.currency || 'INR',
  customerEmail: getCustomerEmail({ order, user }),
  customerName: getCustomerName({ order, user }),
  orderNumber: order.orderNumber || order._id?.toString?.() || order.id || '',
  orderUrl: getOrderDetailsUrl(order),
  total: order.totalPayable ?? order.totals?.grandTotal ?? 0,
});

const buildButton = (href, label) => {
  if (!href) {
    return '';
  }

  return `
    <p style="margin:24px 0">
      <a href="${escapeHtml(href)}" style="background:#111827;color:#ffffff;display:inline-block;padding:12px 18px;text-decoration:none">
        ${escapeHtml(label)}
      </a>
    </p>
  `;
};

const buildShell = ({ body, preheader = '', title }) => `
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
  <div style="background:#f7f5f2;margin:0;padding:24px">
    <div style="background:#ffffff;color:#1f2933;font-family:Arial,sans-serif;margin:0 auto;max-width:640px;padding:28px">
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      <p style="color:#697386;font-size:12px;line-height:1.6;margin:28px 0 0">
        This transactional email was sent by Raven Fold.
      </p>
    </div>
  </div>
`;

const normalizeAttachment = (attachment = {}) => {
  const content = Buffer.isBuffer(attachment.content)
    ? attachment.content.toString('base64')
    : normalizeText(attachment.content);
  const normalized = {
    content,
    file_cache_key: normalizeText(attachment.fileCacheKey || attachment.file_cache_key),
    mime_type: normalizeText(attachment.mimeType || attachment.mime_type),
    name: normalizeText(attachment.name),
  };

  Object.keys(normalized).forEach((key) => {
    if (!normalized[key]) {
      delete normalized[key];
    }
  });

  if (!normalized.name) {
    throw new ApiError(400, 'attachment.name is required');
  }

  if (!normalized.content && !normalized.file_cache_key) {
    throw new ApiError(400, 'attachment content or file cache key is required');
  }

  return normalized;
};

const createEmailPayload = ({
  attachments = [],
  clientReference = '',
  html,
  recipientEmail,
  recipientName = '',
  replyToEmail = '',
  replyToName = '',
  subject,
  text,
}) => {
  const toAddress = normalizeEmailAddress(recipientEmail, 'recipientEmail');
  const fromAddress = normalizeEmailAddress(emailFromAddress, 'EMAIL_FROM_ADDRESS');
  const payload = {
    from: {
      address: fromAddress,
      name: normalizeText(emailFromName),
    },
    subject: normalizeText(subject),
    to: [
      {
        email_address: {
          address: toAddress,
          name: normalizeText(recipientName),
        },
      },
    ],
    track_clicks: false,
    track_opens: false,
  };

  if (!payload.subject) {
    throw new ApiError(400, 'email subject is required');
  }

  if (html) {
    payload.htmlbody = html;
  }

  if (text) {
    payload.textbody = text;
  }

  if (!payload.htmlbody && !payload.textbody) {
    throw new ApiError(400, 'email html or text body is required');
  }

  const replyAddress = replyToEmail || emailReplyToAddress;
  const replyName = replyToName || emailReplyToName;

  if (replyAddress) {
    payload.reply_to = [
      {
        address: normalizeEmailAddress(replyAddress, 'replyToEmail'),
        name: normalizeText(replyName),
      },
    ];
  }

  if (attachments.length) {
    payload.attachments = attachments.map(normalizeAttachment);
  }

  if (clientReference) {
    payload.client_reference = normalizeText(clientReference);
  }

  return payload;
};

const parseZeptoMailError = async (response) => {
  try {
    const payload = await response.json();
    const providerMessage = payload?.message
      || payload?.data?.[0]?.message
      || payload?.error?.message
      || JSON.stringify(payload);

    return providerMessage;
  } catch {
    return response.text();
  }
};

const sendWithZeptoMail = async (payload) => {
  const token = normalizeText(zeptoMailSendToken);

  if (!token) {
    throw new ApiError(500, 'ZeptoMail send token is not configured');
  }

  const authorization = token.toLowerCase().startsWith('zoho-enczapikey ')
    ? token
    : `Zoho-enczapikey ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), emailRequestTimeoutMs);

  try {
    const response = await fetch(zeptoMailApiUrl, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status >= 500 ? 502 : 500,
        `ZeptoMail send failed: ${await parseZeptoMailError(response)}`,
      );
    }

    let providerResponse = null;

    try {
      providerResponse = await response.json();
    } catch {
      providerResponse = null;
    }

    return {
      provider: EMAIL_PROVIDERS.ZEPTO_MAIL,
      providerResponse,
      status: 'sent',
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(504, 'ZeptoMail send timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const sendTransactionalEmail = async (input = {}) => {
  const payload = createEmailPayload(input);
  const provider = normalizeText(emailProvider).toLowerCase();

  if (!provider || provider === EMAIL_PROVIDERS.LOG) {
    logger.info('Transactional email payload generated', {
      attachments: payload.attachments?.map((attachment) => ({
        mimeType: attachment.mime_type,
        name: attachment.name,
      })) || [],
      clientReference: payload.client_reference || '',
      provider: EMAIL_PROVIDERS.LOG,
      subject: payload.subject,
      to: payload.to.map((entry) => entry.email_address.address),
    });

    return {
      provider: EMAIL_PROVIDERS.LOG,
      status: 'logged',
    };
  }

  if (provider === EMAIL_PROVIDERS.ZEPTO_MAIL) {
    return sendWithZeptoMail(payload);
  }

  throw new ApiError(500, `Unsupported EMAIL_PROVIDER: ${provider}`);
};

const sendPasswordResetEmail = async ({ resetToken, user }) => {
  const resetUrl = getResetPasswordUrl(resetToken);

  if (!resetUrl) {
    throw new ApiError(500, 'FRONTEND_URL must be configured before password reset emails can be sent');
  }

  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        We received a request to reset your Raven Fold password.
      </p>
      ${buildButton(resetUrl, 'Reset password')}
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px">
        If the button does not work, open this link:
      </p>
      <p style="font-size:13px;line-height:1.6;margin:0;word-break:break-all">
        ${escapeHtml(resetUrl)}
      </p>
      <p style="font-size:14px;line-height:1.7;margin:18px 0 0">
        Ignore this email if you did not request a password reset.
      </p>
    `,
    preheader: 'Reset your Raven Fold account password.',
    title: 'Reset your password',
  });

  return sendTransactionalEmail({
    clientReference: `password-reset:${user._id?.toString?.() || user.id || user.email}`,
    html,
    recipientEmail: user.email,
    recipientName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    subject: 'Reset your Raven Fold password',
    text: `Reset your Raven Fold password: ${resetUrl}`,
  });
};

const sendReviewReminderEmail = async ({
  customerName,
  orderNumber,
  productName,
  recipientEmail,
  reviewUrl,
  variantDetails = '',
}) => {
  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        Hi ${escapeHtml(customerName || 'Customer')}, your feedback helps other shoppers choose better.
      </p>
      <p style="font-size:15px;line-height:1.7;margin:0">
        Please review ${escapeHtml(productName || 'your purchase')}${variantDetails ? ` (${escapeHtml(variantDetails)})` : ''} from order ${escapeHtml(orderNumber || '')}.
      </p>
      ${buildButton(reviewUrl, 'Write a review')}
    `,
    preheader: 'Tell us how your recent purchase worked out.',
    title: 'How was your recent purchase?',
  });

  return sendTransactionalEmail({
    clientReference: `review-reminder:${orderNumber}:${productName}`,
    html,
    recipientEmail,
    recipientName: customerName,
    subject: 'How was your recent purchase?',
    text: `Please review ${productName || 'your purchase'} from order ${orderNumber || ''}: ${reviewUrl}`,
  });
};

const sendInvoiceEmail = async ({ invoice, pdfBuffer }) => {
  const customer = invoice.customerSnapshot || {};
  const seller = invoice.sellerSnapshot || {};
  const recipientEmail = customer.email;
  const customerName = customer.customerName || customer.businessName || 'Customer';
  const invoiceNumber = invoice.invoiceNumber || 'invoice';
  const amount = invoice.totals?.grandTotal ?? invoice.totals?.totalPayable ?? 0;
  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        Hi ${escapeHtml(customerName)}, your tax invoice is attached for order ${escapeHtml(invoice.orderNumber || '')}.
      </p>
      <p style="font-size:15px;line-height:1.7;margin:0">
        Invoice ${escapeHtml(invoiceNumber)}${invoice.invoiceDate ? ` dated ${escapeHtml(formatDate(invoice.invoiceDate))}` : ''} for ${escapeHtml(formatCurrency(amount))}.
      </p>
    `,
    preheader: `Invoice ${invoiceNumber} for your Raven Fold order.`,
    title: 'Your tax invoice',
  });

  return sendTransactionalEmail({
    attachments: [
      {
        content: pdfBuffer,
        mimeType: 'application/pdf',
        name: `${invoiceNumber}.pdf`,
      },
    ],
    clientReference: `gst-invoice:${invoice._id?.toString?.() || invoice.id || invoiceNumber}`,
    html,
    recipientEmail,
    recipientName: customerName,
    subject: `Tax invoice ${invoiceNumber}`,
    text: `Your tax invoice ${invoiceNumber} from ${seller.brandName || 'Raven Fold'} is attached.`,
  });
};

const sendOrderPaymentEmail = async ({ order, paymentStatus, user }) => {
  const details = getOrderEmailBase({ order, user });
  const isPaid = paymentStatus === 'paid';
  const title = isPaid ? 'Order confirmed' : 'Payment failed';
  const bodyText = isPaid
    ? `Your order ${details.orderNumber} is confirmed and payment is complete.`
    : `Payment for order ${details.orderNumber} was not completed.`;
  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        Hi ${escapeHtml(details.customerName)}, ${escapeHtml(bodyText)}
      </p>
      <p style="font-size:15px;line-height:1.7;margin:0">
        Amount: ${escapeHtml(formatCurrency(details.total, details.currency))}.
      </p>
      ${buildButton(details.orderUrl, 'View order')}
    `,
    preheader: bodyText,
    title,
  });

  return sendTransactionalEmail({
    clientReference: `order-payment:${paymentStatus}:${details.orderNumber}`,
    html,
    recipientEmail: details.customerEmail,
    recipientName: details.customerName,
    subject: isPaid ? `Order confirmed ${details.orderNumber}` : `Payment failed for order ${details.orderNumber}`,
    text: `${bodyText} Amount: ${formatCurrency(details.total, details.currency)}.`,
  });
};

const sendShipmentStatusEmail = async ({
  order,
  shipment = {},
  shipmentStatus = '',
  user,
}) => {
  const details = getOrderEmailBase({ order, user });
  const lifecycleStatus = getShipmentLifecycleStatus(shipmentStatus || shipment.status);
  const trackingId = getShipmentTrackingId(shipment);
  const trackingUrl = normalizeText(shipment.trackingUrl);
  const courierName = normalizeText(shipment.courierName) || formatLabel(shipment.provider || 'courier');
  const statusLabels = {
    delivered: {
      body: `Order ${details.orderNumber} has been delivered.`,
      preheader: `Order ${details.orderNumber} has been delivered.`,
      subject: `Order delivered ${details.orderNumber}`,
      title: 'Order delivered',
    },
    out_for_delivery: {
      body: `Order ${details.orderNumber} is out for delivery today.`,
      preheader: `Order ${details.orderNumber} is out for delivery.`,
      subject: `Order out for delivery ${details.orderNumber}`,
      title: 'Order out for delivery',
    },
    shipped: {
      body: `Order ${details.orderNumber} has been shipped.`,
      preheader: trackingId
        ? `Order ${details.orderNumber} shipped. Tracking ID: ${trackingId}.`
        : `Order ${details.orderNumber} has been shipped.`,
      subject: `Order shipped ${details.orderNumber}`,
      title: 'Order shipped',
    },
  };
  const content = statusLabels[lifecycleStatus];

  if (!content) {
    throw new ApiError(400, 'shipmentStatus must be shipped, out_for_delivery, or delivered');
  }

  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        Hi ${escapeHtml(details.customerName)}, ${escapeHtml(content.body)}
      </p>
      ${trackingId ? `
        <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
          Tracking ID: <strong>${escapeHtml(trackingId)}</strong>
        </p>
      ` : ''}
      ${courierName ? `
        <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
          Courier: ${escapeHtml(courierName)}
        </p>
      ` : ''}
      ${trackingUrl ? `
        <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
          Tracking link: <a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a>
        </p>
      ` : ''}
      ${buildButton(details.orderUrl, 'View order')}
    `,
    preheader: content.preheader,
    title: content.title,
  });

  return sendTransactionalEmail({
    clientReference: `shipment-status:${lifecycleStatus}:${details.orderNumber}:${trackingId || shipment._id?.toString?.() || shipment.id || ''}`,
    html,
    recipientEmail: details.customerEmail,
    recipientName: details.customerName,
    subject: content.subject,
    text: [
      content.body,
      trackingId ? `Tracking ID: ${trackingId}.` : '',
      courierName ? `Courier: ${courierName}.` : '',
      trackingUrl ? `Tracking link: ${trackingUrl}.` : '',
    ].filter(Boolean).join(' '),
  });
};

const sendRefundEmail = async ({ order, refund, user }) => {
  const details = getOrderEmailBase({ order, user });
  const refundStatus = formatLabel(refund.status || 'pending');
  const amount = refund.amount ?? 0;
  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        Hi ${escapeHtml(details.customerName)}, refund status for order ${escapeHtml(details.orderNumber)} is ${escapeHtml(refundStatus)}.
      </p>
      <p style="font-size:15px;line-height:1.7;margin:0">
        Refund amount: ${escapeHtml(formatCurrency(amount, refund.currency || details.currency))}.
      </p>
      ${buildButton(details.orderUrl, 'View order')}
    `,
    preheader: `Refund ${refundStatus} for order ${details.orderNumber}.`,
    title: `Refund ${refundStatus}`,
  });

  return sendTransactionalEmail({
    clientReference: `refund:${refund.status}:${refund._id?.toString?.() || refund.id || details.orderNumber}`,
    html,
    recipientEmail: details.customerEmail,
    recipientName: details.customerName,
    subject: `Refund ${refundStatus} for order ${details.orderNumber}`,
    text: `Refund ${refundStatus} for order ${details.orderNumber}. Amount: ${formatCurrency(amount, refund.currency || details.currency)}.`,
  });
};

const sendContactInquiryEmail = async ({
  email,
  message,
  name,
  orderNumber = '',
  topic = 'Contact inquiry',
}) => {
  const customerEmail = normalizeEmailAddress(email, 'email');
  const customerName = normalizeText(name);
  const normalizedTopic = normalizeText(topic) || 'Contact inquiry';
  const normalizedOrderNumber = normalizeText(orderNumber);
  const normalizedMessage = normalizeText(message);
  const html = buildShell({
    body: `
      <p style="font-size:15px;line-height:1.7;margin:0 0 12px">
        New contact inquiry from <strong>${escapeHtml(customerName)}</strong>.
      </p>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.6;margin:0 0 18px;width:100%">
        <tr><td style="color:#697386;padding:4px 12px 4px 0;width:120px">Email</td><td style="padding:4px 0">${escapeHtml(customerEmail)}</td></tr>
        <tr><td style="color:#697386;padding:4px 12px 4px 0">Topic</td><td style="padding:4px 0">${escapeHtml(normalizedTopic)}</td></tr>
        ${normalizedOrderNumber ? `<tr><td style="color:#697386;padding:4px 12px 4px 0">Order</td><td style="padding:4px 0">${escapeHtml(normalizedOrderNumber)}</td></tr>` : ''}
      </table>
      <p style="font-size:15px;line-height:1.7;margin:0;white-space:pre-line">${escapeHtml(normalizedMessage)}</p>
    `,
    preheader: `${customerName} sent a Raven Fold contact inquiry.`,
    title: `Contact inquiry: ${normalizedTopic}`,
  });

  return sendTransactionalEmail({
    clientReference: `contact:${Date.now()}:${customerEmail}`,
    html,
    recipientEmail: contactSupportEmail,
    recipientName: 'Raven Fold Support',
    replyToEmail: customerEmail,
    replyToName: customerName,
    subject: `[Raven Fold] ${normalizedTopic}${normalizedOrderNumber ? ` - ${normalizedOrderNumber}` : ''}`,
    text: [
      `Name: ${customerName}`,
      `Email: ${customerEmail}`,
      `Topic: ${normalizedTopic}`,
      normalizedOrderNumber ? `Order number: ${normalizedOrderNumber}` : '',
      '',
      normalizedMessage,
    ].filter(Boolean).join('\n'),
  });
};

export {
  EMAIL_PROVIDERS,
  escapeHtml,
  getResetPasswordUrl,
  sendContactInquiryEmail,
  sendInvoiceEmail,
  sendOrderPaymentEmail,
  sendPasswordResetEmail,
  sendRefundEmail,
  sendReviewReminderEmail,
  sendShipmentStatusEmail,
  sendTransactionalEmail,
};

export default {
  EMAIL_PROVIDERS,
  escapeHtml,
  getResetPasswordUrl,
  sendContactInquiryEmail,
  sendInvoiceEmail,
  sendOrderPaymentEmail,
  sendPasswordResetEmail,
  sendRefundEmail,
  sendReviewReminderEmail,
  sendShipmentStatusEmail,
  sendTransactionalEmail,
};
