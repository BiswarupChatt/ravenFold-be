import { GST_STATE_OPTIONS } from '@/modules/gst/gst.constants.js';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const THREE_COLUMN_GAP = 14;
const THREE_COLUMN_WIDTH = (CONTENT_WIDTH - (THREE_COLUMN_GAP * 2)) / 3;
const THREE_COLUMN_X = [
  MARGIN,
  MARGIN + THREE_COLUMN_WIDTH + THREE_COLUMN_GAP,
  MARGIN + ((THREE_COLUMN_WIDTH + THREE_COLUMN_GAP) * 2),
];
const THEME = {
  background: [0.969, 0.957, 0.937],
  divider: [0.902, 0.875, 0.835],
  muted: [0.373, 0.388, 0.408],
  paper: [1, 1, 1],
  primary: [0.118, 0.161, 0.322],
  secondary: [0.851, 0.275, 0.122],
  soft: [0.984, 0.976, 0.961],
  text: [0.094, 0.094, 0.106],
};

const escapePdfText = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/\r?\n/g, ' ');

const formatMoney = (value = 0) => Number(value || 0).toLocaleString('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const smallNumbers = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const tensNumbers = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const wordsUnderHundred = (value) => {
  if (value < 20) {
    return smallNumbers[value];
  }

  return `${tensNumbers[Math.floor(value / 10)]}${value % 10 ? ` ${smallNumbers[value % 10]}` : ''}`;
};

const wordsUnderThousand = (value) => {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;

  return [
    hundred ? `${smallNumbers[hundred]} hundred` : '',
    rest ? wordsUnderHundred(rest) : '',
  ].filter(Boolean).join(' ');
};

const amountInWords = (amount = 0) => {
  const roundedAmount = Math.round(Number(amount || 0));

  if (roundedAmount === 0) {
    return 'Zero rupees only';
  }

  const groups = [
    ['crore', 10000000],
    ['lakh', 100000],
    ['thousand', 1000],
    ['', 1],
  ];
  let remaining = roundedAmount;
  const words = [];

  for (const [label, divisor] of groups) {
    const groupValue = Math.floor(remaining / divisor);

    if (groupValue) {
      words.push(`${wordsUnderThousand(groupValue)}${label ? ` ${label}` : ''}`);
      remaining %= divisor;
    }
  }

  return `${words.join(' ')} rupees only`.replace(/\b\w/g, (char) => char.toUpperCase());
};

const FONT_WIDTHS = {
  regular: {
    ' ': 278, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, '%': 889, '&': 667,
    A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778,
    H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722,
    O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722,
    V: 667, W: 944, X: 667, Y: 667, Z: 611,
    a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556,
    h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556,
    o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556,
    v: 500, w: 722, x: 500, y: 500, z: 500,
  },
  bold: {
    ' ': 278, ',': 278, '-': 333, '.': 278, '/': 278, ':': 333, '%': 889, '&': 722,
    A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778,
    H: 722, I: 278, J: 556, K: 722, L: 611, M: 833, N: 722,
    O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722,
    V: 667, W: 944, X: 667, Y: 667, Z: 611,
    a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611,
    h: 611, i: 278, j: 278, k: 556, l: 278, m: 889, n: 611,
    o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611,
    v: 556, w: 778, x: 556, y: 556, z: 500,
  },
};

const estimateTextWidth = (text, size = 9, bold = false) => {
  const widths = FONT_WIDTHS[bold ? 'bold' : 'regular'];
  const totalWidth = Array.from(String(text || '')).reduce((total, character) => {
    if (/\d/.test(character)) {
      return total + 556;
    }

    return total + (widths[character] || 556);
  }, 0);

  return (totalWidth / 1000) * size;
};

const wrapText = (text = '', maxWidth = 100, size = 9) => {
  const lines = [];

  String(text || '-').split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (estimateTextWidth(nextLine, size) <= maxWidth) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines.length ? lines : ['-'];
};

const getPartyName = (party = {}, fallback = '-') => (
  party.businessName
  || party.customerName
  || party.fullName
  || party.tradeName
  || party.businessLegalName
  || fallback
);

const getAddressLines = (address = {}) => [
  address.fullName,
  address.addressLine1,
  address.addressLine2,
  [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  address.country,
].filter(Boolean);

const getAddressStateCode = (address = {}) => {
  if (address.stateCode) {
    return address.stateCode;
  }

  return GST_STATE_OPTIONS.find((state) => state.name.toLowerCase() === String(address.state || '').toLowerCase())?.code || '';
};

class PdfCanvas {
  constructor() {
    this.pages = [];
    this.addPage();
  }

  addPage() {
    this.pages.push([]);
    this.color({ fill: THEME.background });
    this.cmd(`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`);
  }

  get commands() {
    return this.pages[this.pages.length - 1];
  }

  y(value, height = 0) {
    return PAGE_HEIGHT - value - height;
  }

  cmd(value) {
    this.commands.push(value);
  }

  color({ fill = null, stroke = null } = {}) {
    if (stroke) {
      this.cmd(`${stroke.join(' ')} RG`);
    }

    if (fill) {
      this.cmd(`${fill.join(' ')} rg`);
    }
  }

  rect(x, y, width, height, { fill = null, stroke = THEME.divider, mode = 'S' } = {}) {
    this.color({ fill, stroke });
    this.cmd(`${x} ${this.y(y, height)} ${width} ${height} re ${mode}`);
  }

  line(x1, y1, x2, y2, color = THEME.divider) {
    this.color({ stroke: color });
    this.cmd(`${x1} ${this.y(y1)} m ${x2} ${this.y(y2)} l S`);
  }

  text(value, x, y, {
    align = 'left',
    bold = false,
    color = THEME.text,
    size = 9,
    width = 0,
  } = {}) {
    const text = escapePdfText(value || '-');
    let nextX = x;

    if (align === 'right') {
      nextX = x + width - estimateTextWidth(value, size, bold);
    }

    if (align === 'center') {
      nextX = x + ((width - estimateTextWidth(value, size, bold)) / 2);
    }

    this.color({ fill: color });
    this.cmd(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${Math.max(nextX, x).toFixed(2)} ${this.y(y).toFixed(2)} Tm (${text}) Tj ET`);
  }

  wrappedText(value, x, y, width, {
    bold = false,
    color = THEME.text,
    lineHeight = 10,
    maxLines = 0,
    size = 8,
  } = {}) {
    const lines = wrapText(value, width, size);
    const visibleLines = maxLines > 0 ? lines.slice(0, maxLines) : lines;

    visibleLines.forEach((line, index) => {
      this.text(line, x, y + (index * lineHeight), {
        bold,
        color,
        size,
      });
    });

    return y + (visibleLines.length * lineHeight);
  }
}

const drawSectionTitle = (pdf, label, x, y, width) => {
  pdf.text(label, x, y, {
    bold: true,
    color: THEME.primary,
    size: 9,
  });
  pdf.line(x, y + 7, x + width, y + 7, THEME.divider);
};

const drawDetail = (pdf, label, value, x, y, width) => {
  pdf.text(label, x, y, {
    bold: true,
    color: THEME.muted,
    size: 6.8,
  });
  pdf.wrappedText(value || '-', x, y + 10, width, {
    bold: true,
    lineHeight: 9,
    maxLines: 2,
    size: 7.8,
  });
};

const drawHeader = (pdf, invoice) => {
  const seller = invoice.sellerSnapshot || {};
  const legalName = seller.businessLegalName || 'Aurax & Co';
  const configuredBrandName = seller.brandName || seller.tradeName || '';
  const brandName = configuredBrandName && configuredBrandName !== legalName
    ? configuredBrandName
    : 'Raven Fold';
  const brandInitial = brandName.slice(0, 1).toUpperCase() || 'R';
  const invoiceTitleX = THREE_COLUMN_X[2];
  const invoiceTitleWidth = THREE_COLUMN_WIDTH;

  pdf.rect(MARGIN, 20, CONTENT_WIDTH, 8, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });
  pdf.rect(MARGIN + 2, 44, 36, 36, {
    fill: THEME.soft,
    mode: 'B',
    stroke: THEME.divider,
  });
  pdf.text(brandInitial, MARGIN + 14, 67, {
    bold: true,
    color: THEME.primary,
    size: 19,
  });
  pdf.text(brandName, MARGIN + 50, 52, {
    bold: true,
    color: THEME.primary,
    size: 17,
  });
  pdf.text(`by ${legalName}`, MARGIN + 50, 68, {
    bold: true,
    color: THEME.muted,
    size: 8.6,
  });
  pdf.text(`GSTIN: ${seller.gstin || '-'}`, MARGIN + 50, 84, {
    bold: true,
    size: 7.4,
  });

  if (seller.email || seller.contactNumber) {
    pdf.text([seller.email, seller.contactNumber].filter(Boolean).join(' | '), MARGIN + 50, 96, {
      color: THEME.muted,
      size: 7,
    });
  }

  pdf.text('TAX INVOICE', invoiceTitleX, 54, {
    align: 'right',
    bold: true,
    color: THEME.primary,
    size: 20,
    width: invoiceTitleWidth,
  });
  pdf.text(`Invoice No: ${invoice.invoiceNumber || '-'}`, invoiceTitleX, 76, {
    align: 'right',
    bold: true,
    size: 8.4,
    width: invoiceTitleWidth,
  });
  pdf.text(`Date: ${formatDate(invoice.invoiceDate)}`, invoiceTitleX, 91, {
    align: 'right',
    color: THEME.muted,
    size: 8,
    width: invoiceTitleWidth,
  });
};

const drawInvoiceDetails = (pdf, invoice, y) => {
  [
    ['Order No', invoice.orderNumber || '-', THREE_COLUMN_X[0]],
    ['Order Date', formatDate(invoice.orderDate), THREE_COLUMN_X[1]],
    ['Place of Supply', invoice.placeOfSupply || '-', THREE_COLUMN_X[2]],
  ].forEach(([label, value, x]) => drawDetail(
    pdf,
    label,
    value,
    x,
    y,
    THREE_COLUMN_WIDTH,
  ));

  pdf.line(MARGIN, y + 28, MARGIN + CONTENT_WIDTH, y + 28, THEME.divider);

  return y + 40;
};

const drawPartySection = (pdf, title, lines, x, y, width) => {
  drawSectionTitle(pdf, title, x, y, width);

  let nextY = y + 20;
  lines.filter(Boolean).forEach((line, index) => {
    nextY = pdf.wrappedText(line, x, nextY, width, {
      bold: index === 0,
      color: index === 0 ? THEME.text : THEME.muted,
      lineHeight: 9,
      maxLines: index === 0 ? 2 : 1,
      size: index === 0 ? 8.2 : 7.3,
    });
  });

  return nextY;
};

const drawParties = (pdf, invoice, y) => {
  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const sellerAddress = seller.registeredAddress || {};
  const billingAddress = customer.billingAddress || {};
  const shippingAddress = customer.shippingAddress || {};

  const sectionEnds = [];

  sectionEnds.push(drawPartySection(pdf, 'Seller', [
    seller.businessLegalName || 'Aurax & Co',
    ...getAddressLines(sellerAddress).filter((line) => line !== sellerAddress.fullName),
    getAddressStateCode(sellerAddress) ? `State Code: ${getAddressStateCode(sellerAddress)}` : '',
    seller.gstin ? `GSTIN: ${seller.gstin}` : '',
    seller.pan ? `PAN: ${seller.pan}` : '',
  ], THREE_COLUMN_X[0], y, THREE_COLUMN_WIDTH));
  sectionEnds.push(drawPartySection(pdf, 'Bill To', [
    getPartyName(customer, 'Customer'),
    ...getAddressLines(billingAddress).filter((line) => line !== billingAddress.fullName),
    getAddressStateCode(billingAddress) ? `State Code: ${getAddressStateCode(billingAddress)}` : '',
    customer.contactNumber ? `Mobile: ${customer.contactNumber}` : '',
    customer.email ? `Email: ${customer.email}` : '',
    customer.gstin ? `GSTIN: ${customer.gstin}` : '',
  ], THREE_COLUMN_X[1], y, THREE_COLUMN_WIDTH));
  sectionEnds.push(drawPartySection(pdf, 'Ship To', [
    shippingAddress.fullName || customer.customerName || '-',
    ...getAddressLines(shippingAddress).filter((line) => line !== shippingAddress.fullName),
  ], THREE_COLUMN_X[2], y, THREE_COLUMN_WIDTH));

  const dividerY = Math.max(...sectionEnds) + 8;

  pdf.line(MARGIN, dividerY, MARGIN + CONTENT_WIDTH, dividerY, THEME.divider);

  return dividerY + 20;
};

const tableColumns = [
  ['#', 20, 'center'],
  ['Description', 142, 'left'],
  ['HSN', 42, 'left'],
  ['Qty', 28, 'right'],
  ['Rate', 50, 'right'],
  ['Disc', 44, 'right'],
  ['Taxable', 54, 'right'],
  ['GST %', 38, 'right'],
  ['GST Amt', 56, 'right'],
  ['Total', 57, 'right'],
];

const getItemTaxAmount = (item = {}) => (
  Number(item.cgstAmount || 0)
  + Number(item.sgstAmount || 0)
  + Number(item.igstAmount || 0)
  + Number(item.cessAmount || 0)
);

const drawTableHeader = (pdf, y) => {
  let x = MARGIN;

  pdf.rect(MARGIN, y, CONTENT_WIDTH, 22, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });

  tableColumns.forEach(([label, width, align]) => {
    pdf.text(label, x + 4, y + 14, {
      align,
      bold: true,
      color: THEME.paper,
      size: 6.8,
      width: width - 8,
    });
    x += width;
  });

  return y + 22;
};

const drawContinuedHeader = (pdf, invoice) => {
  pdf.text('TAX INVOICE', MARGIN, 42, {
    bold: true,
    color: THEME.primary,
    size: 13,
  });
  pdf.text(`${invoice.invoiceNumber || '-'} / continued`, MARGIN + 350, 42, {
    align: 'right',
    color: THEME.muted,
    size: 8,
    width: 180,
  });
  pdf.line(MARGIN, 52, MARGIN + CONTENT_WIDTH, 52, THEME.primary);
};

const drawItemRow = (pdf, invoice, item, index, y) => {
  const descriptionLines = wrapText(item.description || 'Product', tableColumns[1][1] - 8, 6.8).slice(0, 3);
  const rowHeight = Math.max(24, 10 + (descriptionLines.length * 8));

  if (y + rowHeight > 672) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
    y = drawTableHeader(pdf, 66);
  }

  if (index % 2 === 1) {
    pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, {
      fill: THEME.soft,
      mode: 'f',
      stroke: THEME.soft,
    });
  }
  pdf.line(MARGIN, y + rowHeight, MARGIN + CONTENT_WIDTH, y + rowHeight, THEME.divider);

  const values = [
    index + 1,
    descriptionLines,
    item.hsnCode || '-',
    item.quantity || 0,
    formatMoney(item.unitPrice),
    formatMoney(item.discountAmount),
    formatMoney(item.taxableValue),
    `${formatMoney(item.gstRate)}%`,
    formatMoney(getItemTaxAmount(item)),
    formatMoney(item.lineTotal),
  ];
  let x = MARGIN;

  tableColumns.forEach(([, width, align], columnIndex) => {
    const value = values[columnIndex];

    if (Array.isArray(value)) {
      value.forEach((line, lineIndex) => {
        pdf.text(line, x + 4, y + 13 + (lineIndex * 8), {
          color: THEME.text,
          size: 6.8,
        });
      });
    } else {
      pdf.text(String(value), x + 4, y + 15, {
        align,
        size: 6.8,
        width: width - 8,
      });
    }

    x += width;
  });

  return y + rowHeight;
};

const drawItems = (pdf, invoice, y) => {
  pdf.text('Items', MARGIN, y, {
    bold: true,
    color: THEME.primary,
    size: 10.5,
  });

  let nextY = drawTableHeader(pdf, y + 12);

  (invoice.items || []).forEach((item, index) => {
    nextY = drawItemRow(pdf, invoice, item, index, nextY);
  });

  return nextY + 14;
};

const drawTotals = (pdf, invoice, y) => {
  const totals = invoice.totals || {};
  const shipping = invoice.shipping || {};
  const leftWidth = 310;
  const rightX = MARGIN + 350;
  const rightWidth = CONTENT_WIDTH - 350;
  const rows = [
    ['Taxable Value', totals.totalTaxableValue],
    ['Shipping Taxable', shipping.taxableValue],
    ['CGST', totals.totalCgst],
    ['SGST', totals.totalSgst],
    ['IGST', totals.totalIgst],
    ['Cess', totals.totalCess],
    ['Round Off', totals.roundOffAmount],
  ].filter(([, value]) => Number(value || 0) !== 0);
  const summaryRows = [
    ...rows,
    ['Total GST', totals.totalGst],
  ];
  const requiredHeight = Math.max(142, 68 + (summaryRows.length * 12));

  if (y + requiredHeight > 792) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
    y = 70;
  }

  drawSectionTitle(pdf, 'Amount in Words', MARGIN, y, leftWidth);
  pdf.wrappedText(amountInWords(totals.grandTotal), MARGIN, y + 20, leftWidth, {
    bold: true,
    lineHeight: 11,
    maxLines: 3,
    size: 8.4,
  });

  const bankDetails = invoice.sellerSnapshot?.bankDetails || {};
  const bankLines = [
    bankDetails.bankName ? `Bank: ${bankDetails.bankName}` : '',
    bankDetails.accountNumber ? `A/C: ${bankDetails.accountNumber}` : '',
    bankDetails.ifsc ? `IFSC: ${bankDetails.ifsc}` : '',
  ].filter(Boolean);

  if (bankLines.length) {
    pdf.text('Bank Details', MARGIN, y + 62, {
      bold: true,
      color: THEME.primary,
      size: 8,
    });
    bankLines.slice(0, 3).forEach((line, index) => {
      pdf.text(line, MARGIN, y + 76 + (index * 10), {
        color: THEME.muted,
        size: 7.2,
      });
    });
  }

  drawSectionTitle(pdf, 'Tax Summary', rightX, y, rightWidth);
  summaryRows.forEach(([label, value], index) => {
    const rowY = y + 22 + (index * 12);

    pdf.text(label, rightX, rowY, {
      color: THEME.muted,
      size: 7.4,
    });
    pdf.text(formatMoney(value), rightX + 98, rowY, {
      align: 'right',
      bold: true,
      size: 7.4,
      width: rightWidth - 98,
    });
  });

  const grandTotalY = Math.max(y + 104, y + 30 + (summaryRows.length * 12));

  pdf.line(rightX, grandTotalY - 12, rightX + rightWidth, grandTotalY - 12, THEME.primary);
  pdf.rect(rightX, grandTotalY - 6, rightWidth, 28, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });
  pdf.text('Grand Total', rightX + 8, grandTotalY + 12, {
    bold: true,
    color: THEME.paper,
    size: 8.8,
  });
  pdf.text(`INR ${formatMoney(totals.grandTotal)}`, rightX + 88, grandTotalY + 12, {
    align: 'right',
    bold: true,
    color: THEME.paper,
    size: 9,
    width: rightWidth - 96,
  });

  return grandTotalY + 38;
};

const drawTermsAndSignatory = (pdf, invoice, y) => {
  const seller = invoice.sellerSnapshot || {};
  const signatory = seller.authorisedSignatory || {};
  const termsAndNotes = [
    ['Notes:', seller.invoiceNotes],
    ['Terms:', seller.invoiceTerms],
  ].filter(([, value]) => value);
  const sectionGap = 32;
  const availableWidth = CONTENT_WIDTH - sectionGap;
  const termsWidth = (availableWidth * 2) / 3;
  const signatoryWidth = availableWidth / 3;
  const rightX = MARGIN + termsWidth + sectionGap;
  const bottomY = 742;

  if (y > bottomY - 18) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
  }

  y = bottomY;

  drawSectionTitle(pdf, 'Terms and Notes', MARGIN, y, termsWidth);
  if (!termsAndNotes.length) {
    pdf.wrappedText('This is a computer generated tax invoice.', MARGIN, y + 20, termsWidth, {
      color: THEME.muted,
      lineHeight: 9,
      maxLines: 4,
      size: 7.2,
    });
  } else {
    let nextTextY = y + 20;
    let remainingLines = 4;

    termsAndNotes.forEach(([label, value]) => {
      if (remainingLines <= 0) {
        return;
      }

      const labelWidth = estimateTextWidth(label, 7.2, true) + 4;
      const textX = MARGIN + labelWidth;
      const lines = wrapText(value, termsWidth - labelWidth, 7.2).slice(0, remainingLines);

      pdf.text(label, MARGIN, nextTextY, {
        bold: true,
        color: THEME.muted,
        size: 7.2,
      });

      lines.forEach((line, index) => {
        pdf.text(line, textX, nextTextY + (index * 9), {
          color: THEME.muted,
          size: 7.2,
        });
      });

      nextTextY += lines.length * 9;
      remainingLines -= lines.length;
    });
  }

  pdf.line(rightX, y + 7, rightX + signatoryWidth, y + 7, THEME.muted);
  pdf.text(signatory.name || seller.businessLegalName || '-', rightX, y + 24, {
    align: 'center',
    bold: true,
    size: 7.6,
    width: signatoryWidth,
  });
  pdf.text(signatory.designation || 'Authorised Signatory', rightX, y + 35, {
    align: 'center',
    color: THEME.muted,
    size: 6.8,
    width: signatoryWidth,
  });
};

const drawPageNumbers = (pdf) => {
  const pageCount = pdf.pages.length;

  pdf.pages.forEach((commands, index) => {
    commands.push(`${THEME.muted.join(' ')} rg`);
    commands.push(`BT /F1 7 Tf 1 0 0 1 ${MARGIN} 20 Tm (Page ${index + 1} of ${pageCount}) Tj ET`);
  });
};

const buildPdf = (pageStreams = []) => {
  const pageCount = pageStreams.length;
  const pageObjectIds = pageStreams.map((_, index) => 5 + (index * 2));
  const contentObjectIds = pageStreams.map((_, index) => 6 + (index * 2));
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];

  pageStreams.forEach((stream, index) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  let output = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output);
};

const generateInvoicePdfBuffer = (invoice) => {
  const pdf = new PdfCanvas();

  drawHeader(pdf, invoice);
  let y = drawInvoiceDetails(pdf, invoice, 118);

  y = drawParties(pdf, invoice, y);
  y = drawItems(pdf, invoice, y);
  y = drawTotals(pdf, invoice, y);
  drawTermsAndSignatory(pdf, invoice, y + 4);
  drawPageNumbers(pdf);

  return buildPdf(pdf.pages.map((commands) => commands.join('\n')));
};

export { amountInWords, generateInvoicePdfBuffer };

export default {
  amountInWords,
  generateInvoicePdfBuffer,
};
