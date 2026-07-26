import { SHIPPING_GST_TREATMENTS, SUPPLY_TYPES } from '@/modules/gst/gst.constants.js';

const toPaise = (value) => Math.max(Math.round(Number(value || 0) * 100), 0);
const fromPaise = (value) => Number((Math.round(Number(value || 0)) / 100).toFixed(2));
const toRateBps = (value) => Math.max(Math.round(Number(value || 0) * 100), 0);
const roundPaise = (value) => Math.max(Math.round(Number(value || 0)), 0);

const getFinancialYear = (date = new Date()) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = value.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`;
};

const allocateAmount = (totalPaise, weights = []) => {
  const cleanTotal = toPaise(fromPaise(totalPaise));
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(Number(weight || 0), 0), 0);

  if (cleanTotal <= 0 || totalWeight <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  let allocated = 0;

  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return Math.max(cleanTotal - allocated, 0);
    }

    const share = roundPaise((cleanTotal * Math.max(Number(weight || 0), 0)) / totalWeight);

    allocated += share;
    return share;
  });
};

const calculateTaxAmounts = ({
  amountPaise,
  cessRate = 0,
  gstRate = 0,
  supplyType = SUPPLY_TYPES.INTRA_STATE,
  taxInclusive = true,
}) => {
  const gstRateBps = toRateBps(gstRate);
  const cessRateBps = toRateBps(cessRate);
  const totalRateBps = gstRateBps + cessRateBps;
  let taxablePaise = roundPaise(amountPaise);
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  let cessPaise = 0;
  let lineTotalPaise = roundPaise(amountPaise);

  if (totalRateBps > 0 && taxInclusive) {
    taxablePaise = roundPaise((amountPaise * 10000) / (10000 + totalRateBps));
    const totalTaxPaise = Math.max(roundPaise(amountPaise) - taxablePaise, 0);
    cessPaise = roundPaise((totalTaxPaise * cessRateBps) / totalRateBps);
    const gstTaxPaise = Math.max(totalTaxPaise - cessPaise, 0);

    if (supplyType === SUPPLY_TYPES.INTER_STATE) {
      igstPaise = gstTaxPaise;
    } else {
      cgstPaise = Math.floor(gstTaxPaise / 2);
      sgstPaise = gstTaxPaise - cgstPaise;
    }
  } else if (totalRateBps > 0) {
    const gstTaxPaise = roundPaise((taxablePaise * gstRateBps) / 10000);
    cessPaise = roundPaise((taxablePaise * cessRateBps) / 10000);

    if (supplyType === SUPPLY_TYPES.INTER_STATE) {
      igstPaise = gstTaxPaise;
    } else {
      cgstPaise = Math.floor(gstTaxPaise / 2);
      sgstPaise = gstTaxPaise - cgstPaise;
    }

    lineTotalPaise = taxablePaise + gstTaxPaise + cessPaise;
  }

  return {
    cessAmount: fromPaise(cessPaise),
    cgstAmount: fromPaise(cgstPaise),
    igstAmount: fromPaise(igstPaise),
    lineTotal: fromPaise(lineTotalPaise),
    sgstAmount: fromPaise(sgstPaise),
    taxableValue: fromPaise(taxablePaise),
    totalTax: fromPaise(cgstPaise + sgstPaise + igstPaise + cessPaise),
  };
};

const getItemGstSnapshot = (item = {}, config = {}) => {
  const snapshot = item.gstSnapshot || item.gst || {};
  const configuredRate = Number(snapshot.gstRate ?? config.defaultGstRate ?? 0);
  const gstRate = snapshot.exempt ? 0 : configuredRate;
  const cgstRate = snapshot.exempt ? 0 : Number(snapshot.cgstRate ?? gstRate / 2);
  const sgstRate = snapshot.exempt ? 0 : Number(snapshot.sgstRate ?? gstRate / 2);
  const igstRate = snapshot.exempt ? 0 : Number(snapshot.igstRate ?? gstRate);

  return {
    cessRate: Number(snapshot.cessRate || 0),
    cgstRate,
    exempt: Boolean(snapshot.exempt),
    exemptionReason: snapshot.exemptionReason || '',
    gstRate,
    hsnCode: snapshot.hsnCode || '',
    igstRate,
    sgstRate,
    taxInclusive: typeof snapshot.taxInclusive === 'boolean'
      ? snapshot.taxInclusive
      : snapshot.pricingMode !== 'exclusive',
  };
};

const calculateOrderGst = ({
  billingAddress = {},
  config = {},
  invoiceType,
  items = [],
  orderDate = new Date(),
  productDiscountAmount = 0,
  shippingAddress = {},
  shippingCharge = 0,
  shippingDiscountAmount = 0,
} = {}) => {
  const sellerStateCode = config.registeredAddress?.stateCode || '';
  const placeOfSupplyStateCode = billingAddress.stateCode || shippingAddress.stateCode || '';
  const supplyType = sellerStateCode && placeOfSupplyStateCode && sellerStateCode !== placeOfSupplyStateCode
    ? SUPPLY_TYPES.INTER_STATE
    : SUPPLY_TYPES.INTRA_STATE;
  const lineAmounts = items.map((item) => toPaise(item.lineTotal));
  const productDiscountAllocations = allocateAmount(toPaise(productDiscountAmount), lineAmounts);
  const itemTaxLines = items.map((item, index) => {
    const gst = getItemGstSnapshot(item, config);
    const lineAmountPaise = Math.max(toPaise(item.lineTotal) - productDiscountAllocations[index], 0);
    const amounts = calculateTaxAmounts({
      amountPaise: lineAmountPaise,
      cessRate: gst.cessRate,
      gstRate: gst.gstRate,
      supplyType,
      taxInclusive: gst.taxInclusive,
    });

    return {
      cessRate: gst.cessRate,
      cgstAmount: amounts.cgstAmount,
      cgstRate: supplyType === SUPPLY_TYPES.INTRA_STATE ? gst.cgstRate : 0,
      discountAmount: fromPaise(productDiscountAllocations[index]),
      exempt: gst.exempt,
      exemptionReason: gst.exemptionReason,
      gstRate: gst.gstRate,
      hsnCode: gst.hsnCode,
      igstAmount: amounts.igstAmount,
      igstRate: supplyType === SUPPLY_TYPES.INTER_STATE ? gst.igstRate : 0,
      lineTotal: amounts.lineTotal,
      orderItemIndex: index,
      sgstAmount: amounts.sgstAmount,
      sgstRate: supplyType === SUPPLY_TYPES.INTRA_STATE ? gst.sgstRate : 0,
      taxableValue: amounts.taxableValue,
      taxInclusive: gst.taxInclusive,
      totalTax: amounts.totalTax,
    };
  });
  const shippingNetPaise = Math.max(toPaise(shippingCharge) - toPaise(shippingDiscountAmount), 0);
  const shippingTaxable = config.shippingGstTreatment !== SHIPPING_GST_TREATMENTS.EXEMPT && shippingNetPaise > 0;
  const shippingGstRate = shippingTaxable ? Number(config.shippingGstRate ?? config.defaultGstRate ?? 0) : 0;
  const shippingTaxInclusive = true;
  const shippingAmounts = calculateTaxAmounts({
    amountPaise: shippingNetPaise,
    gstRate: shippingGstRate,
    supplyType,
    taxInclusive: shippingTaxInclusive,
  });
  const totals = [...itemTaxLines, {
    cessAmount: shippingAmounts.cessAmount,
    cgstAmount: shippingAmounts.cgstAmount,
    igstAmount: shippingAmounts.igstAmount,
    lineTotal: shippingAmounts.lineTotal,
    sgstAmount: shippingAmounts.sgstAmount,
    taxableValue: shippingAmounts.taxableValue,
  }].reduce(
    (summary, line) => ({
      cessAmount: summary.cessAmount + toPaise(line.cessAmount),
      cgstAmount: summary.cgstAmount + toPaise(line.cgstAmount),
      grandTotal: summary.grandTotal + toPaise(line.lineTotal),
      igstAmount: summary.igstAmount + toPaise(line.igstAmount),
      sgstAmount: summary.sgstAmount + toPaise(line.sgstAmount),
      taxableValue: summary.taxableValue + toPaise(line.taxableValue),
    }),
    {
      cessAmount: 0,
      cgstAmount: 0,
      grandTotal: 0,
      igstAmount: 0,
      sgstAmount: 0,
      taxableValue: 0,
    },
  );
  const grandTotal = fromPaise(totals.grandTotal);

  return {
    financialYear: getFinancialYear(orderDate),
    invoiceType,
    items: itemTaxLines,
    placeOfSupply: billingAddress.state || shippingAddress.state || '',
    placeOfSupplyStateCode,
    shipping: {
      cessAmount: shippingAmounts.cessAmount,
      cgstAmount: shippingAmounts.cgstAmount,
      cgstRate: supplyType === SUPPLY_TYPES.INTRA_STATE ? shippingGstRate / 2 : 0,
      discountAmount: fromPaise(toPaise(shippingDiscountAmount)),
      grossAmount: fromPaise(toPaise(shippingCharge)),
      igstAmount: shippingAmounts.igstAmount,
      igstRate: supplyType === SUPPLY_TYPES.INTER_STATE ? shippingGstRate : 0,
      netAmount: shippingAmounts.lineTotal,
      sgstAmount: shippingAmounts.sgstAmount,
      sgstRate: supplyType === SUPPLY_TYPES.INTRA_STATE ? shippingGstRate / 2 : 0,
      taxableValue: shippingAmounts.taxableValue,
      taxInclusive: shippingTaxInclusive,
      totalTax: shippingAmounts.totalTax,
      treatment: config.shippingGstTreatment || SHIPPING_GST_TREATMENTS.TAXABLE,
    },
    supplyType,
    totals: {
      discountTotal: fromPaise(toPaise(productDiscountAmount) + toPaise(shippingDiscountAmount)),
      grandTotal,
      roundOffAmount: Number((grandTotal - fromPaise(totals.grandTotal)).toFixed(2)),
      totalCess: fromPaise(totals.cessAmount),
      totalCgst: fromPaise(totals.cgstAmount),
      totalGst: fromPaise(totals.cgstAmount + totals.sgstAmount + totals.igstAmount + totals.cessAmount),
      totalIgst: fromPaise(totals.igstAmount),
      totalSgst: fromPaise(totals.sgstAmount),
      totalTaxableValue: fromPaise(totals.taxableValue),
    },
  };
};

export {
  allocateAmount,
  calculateOrderGst,
  calculateTaxAmounts,
  fromPaise,
  getFinancialYear,
  toPaise,
};

export default {
  allocateAmount,
  calculateOrderGst,
  calculateTaxAmounts,
  fromPaise,
  getFinancialYear,
  toPaise,
};
