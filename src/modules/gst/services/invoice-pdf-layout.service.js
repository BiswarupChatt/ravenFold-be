const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
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

const getAddressLines = (address = {}) => [
  address.fullName,
  address.addressLine1,
  address.addressLine2,
  [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  address.country,
].filter(Boolean);

const getPartyName = (party = {}, fallback = '-') => (
  party.businessLegalName
  || party.businessName
  || party.tradeName
  || party.customerName
  || party.fullName
  || fallback
);

const estimateTextWidth = (text, size = 9) => String(text || '').length * size * 0.48;

const wrapText = (text = '', maxWidth = 100, size = 9) => {
  const words = String(text || '-').split(/\s+/).filter(Boolean);
  const lines = [];
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

  return lines.length ? lines : ['-'];
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

  rect(x, y, width, height, { fill = null, stroke = [0.78, 0.78, 0.78], mode = 'S' } = {}) {
    this.color({ fill, stroke });
    this.cmd(`${x} ${this.y(y, height)} ${width} ${height} re ${mode}`);
  }

  line(x1, y1, x2, y2, color = [0.78, 0.78, 0.78]) {
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
      nextX = x + width - estimateTextWidth(value, size);
    }

    if (align === 'center') {
      nextX = x + ((width - estimateTextWidth(value, size)) / 2);
    }

    this.color({ fill: color });
    this.cmd(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${Math.max(nextX, x).toFixed(2)} ${this.y(y).toFixed(2)} Tm (${text}) Tj ET`);
  }

  wrappedText(value, x, y, width, {
    bold = false,
    color = THEME.text,
    lineHeight = 11,
    maxLines = 0,
    size = 9,
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

const drawSectionHeader = (pdf, label, x, y, width) => {
  pdf.rect(x, y, width, 22, {
    fill: THEME.soft,
    mode: 'B',
    stroke: THEME.divider,
  });
  pdf.text(label, x + 10, y + 14, {
    bold: true,
    size: 9,
  });
};

const drawLabelValue = (pdf, label, value, x, y, width) => {
  pdf.text(label, x, y, {
    bold: true,
    color: THEME.muted,
    size: 6.8,
  });
  pdf.wrappedText(value || '-', x, y + 10, width, {
    lineHeight: 10,
    maxLines: 2,
    size: 8.2,
  });
};

const drawAddressPanel = (pdf, { address = {}, gstin = '', name = '', title = '' }, x, y, width, height) => {
  pdf.rect(x, y, width, height, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, title, x, y, width);
  pdf.wrappedText(name || '-', x + 10, y + 38, width - 20, {
    bold: true,
    lineHeight: 10,
    maxLines: 2,
    size: 8.5,
  });

  let nextY = y + 58;
  getAddressLines(address).slice(0, 4).forEach((line) => {
    nextY = pdf.wrappedText(line, x + 10, nextY, width - 20, {
      color: THEME.muted,
      lineHeight: 9,
      maxLines: 1,
      size: 7.5,
    });
  });

  if (gstin) {
    pdf.text(`GSTIN: ${gstin}`, x + 10, y + height - 10, {
      bold: true,
      size: 7.4,
    });
  }
};

const drawHeader = (pdf, invoice) => {
  const seller = invoice.sellerSnapshot || {};
  const sellerName = getPartyName(seller, 'RavenFold');
  const brandInitial = sellerName.slice(0, 1).toUpperCase() || 'R';

  pdf.rect(MARGIN, 24, CONTENT_WIDTH, 82, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  pdf.rect(MARGIN, 24, CONTENT_WIDTH, 5, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });
  pdf.rect(MARGIN, 29, CONTENT_WIDTH, 1.5, {
    fill: THEME.secondary,
    mode: 'f',
    stroke: THEME.secondary,
  });
  pdf.rect(MARGIN + 14, 45, 42, 42, {
    fill: THEME.soft,
    mode: 'B',
    stroke: THEME.primary,
  });
  pdf.text(brandInitial, MARGIN + 27, 72, {
    bold: true,
    color: THEME.primary,
    size: 22,
  });
  pdf.text(sellerName, MARGIN + 68, 54, {
    bold: true,
    size: 15,
  });
  pdf.text(seller.tradeName || 'GST registered seller', MARGIN + 68, 70, {
    color: THEME.muted,
    size: 8.5,
  });
  pdf.text(`GSTIN: ${seller.gstin || '-'}`, MARGIN + 68, 86, {
    bold: true,
    size: 8,
  });
  pdf.text('TAX INVOICE', MARGIN + 340, 56, {
    align: 'right',
    bold: true,
    color: THEME.primary,
    size: 20,
    width: 176,
  });
  pdf.text(`Invoice No: ${invoice.invoiceNumber || '-'}`, MARGIN + 340, 76, {
    align: 'right',
    bold: true,
    size: 8.5,
    width: 176,
  });
  pdf.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, MARGIN + 340, 91, {
    align: 'right',
    color: THEME.muted,
    size: 8,
    width: 176,
  });
};

const drawInvoiceMeta = (pdf, invoice, y) => {
  const boxWidth = CONTENT_WIDTH / 4;
  const meta = [
    ['Order No', invoice.orderNumber || '-'],
    ['Order Date', formatDate(invoice.orderDate)],
    ['Invoice Type', String(invoice.invoiceType || 'b2c').toUpperCase()],
    ['Supply Type', String(invoice.supplyType || '-').replace(/_/g, ' ').toUpperCase()],
  ];

  pdf.rect(MARGIN, y, CONTENT_WIDTH, 48, {
    fill: THEME.soft,
    mode: 'B',
    stroke: THEME.divider,
  });

  meta.forEach(([label, value], index) => {
    const x = MARGIN + (boxWidth * index);

    if (index > 0) {
      pdf.line(x, y, x, y + 48, THEME.divider);
    }

    drawLabelValue(pdf, label, value, x + 10, y + 12, boxWidth - 20);
  });
};

const getColumns = (invoice) => {
  if (invoice.supplyType === 'inter_state') {
    return [
      ['#', 18, 'center'], ['Description', 128, 'left'], ['HSN', 36, 'left'],
      ['Qty', 24, 'right'], ['Unit', 43, 'right'], ['Disc', 38, 'right'],
      ['Taxable', 50, 'right'], ['Rate', 30, 'right'], ['IGST', 48, 'right'],
      ['Cess', 34, 'right'], ['Total', 46, 'right'],
    ];
  }

  return [
    ['#', 18, 'center'], ['Description', 112, 'left'], ['HSN', 36, 'left'],
    ['Qty', 24, 'right'], ['Unit', 43, 'right'], ['Disc', 38, 'right'],
    ['Taxable', 48, 'right'], ['Rate', 30, 'right'], ['CGST', 42, 'right'],
    ['SGST', 42, 'right'], ['Cess', 34, 'right'], ['Total', 47, 'right'],
  ];
};

const drawTableHeader = (pdf, columns, y) => {
  let x = MARGIN;

  pdf.rect(MARGIN, y, CONTENT_WIDTH, 22, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });

  columns.forEach(([label, width, align]) => {
    pdf.text(label, x + 4, y + 14, {
      align,
      bold: true,
      color: [1, 1, 1],
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
    size: 13,
  });
  pdf.text(`${invoice.invoiceNumber || '-'} / continued`, MARGIN + 350, 42, {
    align: 'right',
    color: THEME.muted,
    size: 8,
    width: 180,
  });
  pdf.line(MARGIN, 52, MARGIN + CONTENT_WIDTH, 52, THEME.secondary);
};

const drawItemRow = (pdf, columns, invoice, item, index, y) => {
  const descriptionLines = wrapText(item.description || 'Product', columns[1][1] - 8, 6.8).slice(0, 3);
  const rowHeight = Math.max(24, 10 + (descriptionLines.length * 8));

  if (y + rowHeight > 690) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
    y = drawTableHeader(pdf, columns, 66);
  }

  pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, {
    fill: index % 2 === 0 ? THEME.paper : THEME.soft,
    mode: 'B',
    stroke: THEME.divider,
  });

  const values = invoice.supplyType === 'inter_state'
    ? [
        index + 1, descriptionLines, item.hsnCode || '-', item.quantity || 0,
        formatMoney(item.unitPrice), formatMoney(item.discountAmount),
        formatMoney(item.taxableValue), `${formatMoney(item.gstRate)}%`,
        formatMoney(item.igstAmount), formatMoney(item.cessAmount), formatMoney(item.lineTotal),
      ]
    : [
        index + 1, descriptionLines, item.hsnCode || '-', item.quantity || 0,
        formatMoney(item.unitPrice), formatMoney(item.discountAmount),
        formatMoney(item.taxableValue), `${formatMoney(item.gstRate)}%`,
        formatMoney(item.cgstAmount), formatMoney(item.sgstAmount),
        formatMoney(item.cessAmount), formatMoney(item.lineTotal),
      ];

  let x = MARGIN;

  columns.forEach(([, width, align], columnIndex) => {
    if (columnIndex > 0) {
      pdf.line(x, y, x, y + rowHeight, THEME.divider);
    }

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

const drawTotals = (pdf, invoice, y) => {
  const totals = invoice.totals || {};
  const shipping = invoice.shipping || {};
  const leftWidth = 314;
  const rightX = MARGIN + 336;
  const rightWidth = CONTENT_WIDTH - 336;

  if (y + 180 > 792) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
    y = 70;
  }

  pdf.rect(MARGIN, y, leftWidth, 132, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, 'Amount in Words', MARGIN, y, leftWidth);
  pdf.wrappedText(amountInWords(totals.grandTotal), MARGIN + 10, y + 40, leftWidth - 20, {
    bold: true,
    lineHeight: 12,
    size: 9,
  });

  const bankDetails = invoice.sellerSnapshot?.bankDetails || {};
  const bankLines = [
    bankDetails.bankName ? `Bank: ${bankDetails.bankName}` : '',
    bankDetails.accountNumber ? `A/C: ${bankDetails.accountNumber}` : '',
    bankDetails.ifsc ? `IFSC: ${bankDetails.ifsc}` : '',
  ].filter(Boolean);

  if (bankLines.length) {
    pdf.text('Bank Details', MARGIN + 10, y + 78, {
      bold: true,
      color: THEME.muted,
      size: 7.4,
    });
    bankLines.forEach((line, index) => {
      pdf.text(line, MARGIN + 10, y + 91 + (index * 10), {
        color: THEME.muted,
        size: 7.4,
      });
    });
  }

  pdf.rect(rightX, y, rightWidth, 164, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, 'Tax Summary', rightX, y, rightWidth);

  [
    ['Shipping Taxable', shipping.taxableValue],
    ['Total Taxable Value', totals.totalTaxableValue],
    ['CGST', totals.totalCgst],
    ['SGST', totals.totalSgst],
    ['IGST', totals.totalIgst],
    ['Cess', totals.totalCess],
    ['Total GST', totals.totalGst],
    ['Round Off', totals.roundOffAmount],
  ].forEach(([label, value], index) => {
    const rowY = y + 36 + (index * 13);

    pdf.text(label, rightX + 10, rowY, {
      color: THEME.muted,
      size: 7.4,
    });
    pdf.text(formatMoney(value), rightX + 98, rowY, {
      align: 'right',
      bold: true,
      size: 7.4,
      width: rightWidth - 108,
    });
  });

  pdf.rect(rightX, y + 132, rightWidth, 32, {
    fill: THEME.primary,
    mode: 'f',
    stroke: THEME.primary,
  });
  pdf.text('Grand Total', rightX + 10, y + 152, {
    bold: true,
    color: [1, 1, 1],
    size: 9.4,
  });
  pdf.text(`INR ${formatMoney(totals.grandTotal)}`, rightX + 96, y + 152, {
    align: 'right',
    bold: true,
    color: [1, 1, 1],
    size: 10,
    width: rightWidth - 106,
  });

  return y + 182;
};

const drawTermsAndSignatory = (pdf, invoice, y) => {
  const seller = invoice.sellerSnapshot || {};
  const signatory = seller.authorisedSignatory || {};
  const terms = seller.invoiceTerms || seller.invoiceNotes || 'This is a computer generated tax invoice.';
  const leftWidth = 334;
  const rightWidth = CONTENT_WIDTH - leftWidth - 16;
  const rightX = MARGIN + leftWidth + 16;

  if (y + 86 > 805) {
    pdf.addPage();
    drawContinuedHeader(pdf, invoice);
    y = 70;
  }

  pdf.rect(MARGIN, y, leftWidth, 82, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, 'Terms and Notes', MARGIN, y, leftWidth);
  pdf.wrappedText(terms, MARGIN + 10, y + 40, leftWidth - 20, {
    color: THEME.muted,
    lineHeight: 10,
    maxLines: 4,
    size: 7.6,
  });

  pdf.rect(rightX, y, rightWidth, 82, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, 'Authorised Signatory', rightX, y, rightWidth);
  pdf.line(rightX + 28, y + 56, rightX + rightWidth - 28, y + 56, THEME.muted);
  pdf.text(signatory.name || seller.businessLegalName || '-', rightX + 10, y + 69, {
    align: 'center',
    bold: true,
    size: 7.8,
    width: rightWidth - 20,
  });
  pdf.text(signatory.designation || 'Authorised Signatory', rightX + 10, y + 79, {
    align: 'center',
    color: THEME.muted,
    size: 6.8,
    width: rightWidth - 20,
  });
};

const drawPageNumbers = (pdf) => {
  const pageCount = pdf.pages.length;

  pdf.pages.forEach((commands, index) => {
    commands.push(`${THEME.muted.join(' ')} rg`);
    commands.push(`BT /F1 7 Tf 1 0 0 1 ${MARGIN} 20 Tm (Page ${index + 1} of ${pageCount}) Tj ET`);
    commands.push(`BT /F1 7 Tf 1 0 0 1 ${PAGE_WIDTH - MARGIN - 190} 20 Tm (Subject to applicable GST verification) Tj ET`);
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
  const seller = invoice.sellerSnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const columns = getColumns(invoice);

  drawHeader(pdf, invoice);
  drawInvoiceMeta(pdf, invoice, 118);
  drawAddressPanel(pdf, {
    address: seller.registeredAddress || {},
    gstin: seller.gstin || '',
    name: getPartyName(seller, 'Seller'),
    title: 'Seller Details',
  }, MARGIN, 180, 259, 116);
  drawAddressPanel(pdf, {
    address: customer.billingAddress || {},
    gstin: invoice.invoiceType === 'b2b' ? customer.gstin : '',
    name: getPartyName(customer, 'Customer'),
    title: invoice.invoiceType === 'b2b' ? 'Bill To - Business' : 'Bill To',
  }, MARGIN + 272, 180, 259, 116);
  drawAddressPanel(pdf, {
    address: customer.shippingAddress || {},
    name: customer.shippingAddress?.fullName || customer.customerName || '-',
    title: 'Ship To',
  }, MARGIN, 310, 259, 94);

  pdf.rect(MARGIN + 272, 310, 259, 94, {
    fill: THEME.paper,
    mode: 'B',
    stroke: THEME.divider,
  });
  drawSectionHeader(pdf, 'Place of Supply', MARGIN + 272, 310, 259);
  drawLabelValue(pdf, 'State', invoice.placeOfSupply || '-', MARGIN + 282, 348, 110);
  drawLabelValue(pdf, 'State Code', invoice.placeOfSupplyStateCode || '-', MARGIN + 407, 348, 70);
  drawLabelValue(pdf, 'Payment', `${invoice.paymentMethod || '-'} / ${invoice.paymentStatus || '-'}`, MARGIN + 282, 380, 230);

  pdf.text('Itemized Tax Details', MARGIN, 430, {
    bold: true,
    size: 11,
  });
  let y = drawTableHeader(pdf, columns, 442);

  (invoice.items || []).forEach((item, index) => {
    y = drawItemRow(pdf, columns, invoice, item, index, y);
  });

  y = drawTotals(pdf, invoice, y + 14);
  drawTermsAndSignatory(pdf, invoice, y + 4);
  drawPageNumbers(pdf);

  return buildPdf(pdf.pages.map((commands) => commands.join('\n')));
};

export { amountInWords, generateInvoicePdfBuffer };

export default {
  amountInWords,
  generateInvoicePdfBuffer,
};
