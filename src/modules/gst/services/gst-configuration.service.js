import ApiError from '@/common/errors/api.error.js';
import {
  formatImageAsset,
  getAddedCloudinaryPublicIds,
  getImageAssetPublicId,
  normalizeImageAsset,
} from '@/common/utils/media-asset.util.js';
import {
  assertDatabaseReady,
  hasOwn,
  normalizeBoolean,
  normalizeText,
} from '@/common/utils/service.util.js';
import { SHIPPING_GST_TREATMENTS } from '@/modules/gst/gst.constants.js';
import GstActivityLog from '@/modules/gst/models/gst-activity-log.model.js';
import GstConfiguration from '@/modules/gst/models/gst-configuration.model.js';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service.js';
import {
  getStateCodeFromState,
  normalizeGstin,
  normalizeRate,
  normalizeStateCode,
  normalizeStateName,
} from '@/modules/gst/services/gst-validation.service.js';

const defaultConfig = {
  authorisedSignatory: {
    designation: 'Authorised Signatory',
    imageUrl: '',
    name: 'Aurax & Co',
  },
  bankDetails: {
    accountName: '',
    accountNumber: '',
    bankName: '',
    branchName: '',
    ifsc: '',
  },
  brandName: 'Raven Fold',
  businessLegalName: 'Aurax & Co',
  businessLogoAsset: null,
  contactNumber: '',
  defaultGstRate: 0,
  email: '',
  gstin: '',
  invoiceNotes: '',
  invoiceNumberFormat: 'RF{FY}{Q}{SEQ}',
  invoicePrefix: 'RF',
  invoiceTerms: '',
  nextInvoiceNumber: 1,
  pan: '',
  registeredAddress: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    country: 'India',
    pincode: '',
    state: '',
    stateCode: '',
  },
  shippingGstRate: 0,
  shippingGstTreatment: SHIPPING_GST_TREATMENTS.TAXABLE,
  tradeName: '',
  useFinancialYearNumbering: true,
};

const getActorId = (actor = null) => actor?.id || null;

const formatConfig = (config = {}) => {
  const normalizedConfig = {
    ...defaultConfig,
    ...(config?.toObject ? config.toObject() : config),
    id: config?._id?.toString?.() || config?.id || null,
    registeredAddress: {
      ...defaultConfig.registeredAddress,
      ...(config.registeredAddress || {}),
    },
    authorisedSignatory: {
      ...defaultConfig.authorisedSignatory,
      ...(config.authorisedSignatory || {}),
    },
    bankDetails: {
      ...defaultConfig.bankDetails,
      ...(config.bankDetails || {}),
    },
  };
  const businessLogoAsset = formatImageAsset(normalizedConfig.businessLogoAsset);

  return {
    ...normalizedConfig,
    businessLogoAsset,
  };
};

const getGstConfiguration = async () => {
  assertDatabaseReady();
  const config = await GstConfiguration.findOne({ singletonKey: 'default' }).lean().exec();

  return formatConfig(config || defaultConfig);
};

const normalizeAddress = (value = {}) => {
  const address = {};

  ['addressLine1', 'addressLine2', 'city', 'country', 'pincode'].forEach((field) => {
    if (hasOwn(value, field)) {
      address[field] = normalizeText(value[field]);
    }
  });

  if (hasOwn(value, 'state')) {
    address.state = normalizeStateName(value.state);
  }

  if (hasOwn(value, 'stateCode')) {
    address.stateCode = normalizeStateCode(value.stateCode);
  }

  if (!address.stateCode && address.state) {
    address.stateCode = getStateCodeFromState(address.state);
  }

  return address;
};

const normalizeBankDetails = (value = {}) => {
  const bankDetails = {};

  ['accountName', 'accountNumber', 'bankName', 'branchName'].forEach((field) => {
    if (hasOwn(value, field)) {
      bankDetails[field] = normalizeText(value[field]);
    }
  });

  if (hasOwn(value, 'ifsc')) {
    bankDetails.ifsc = normalizeText(value.ifsc).toUpperCase();
  }

  return bankDetails;
};

const normalizeSignatory = (value = {}) => {
  const signatory = {};

  ['designation', 'imageUrl', 'name'].forEach((field) => {
    if (hasOwn(value, field)) {
      signatory[field] = normalizeText(value[field]);
    }
  });

  return signatory;
};

const normalizeConfigPayload = (payload = {}) => {
  const update = {};

  [
    'businessLegalName',
    'brandName',
    'tradeName',
    'pan',
    'contactNumber',
    'email',
    'invoiceNumberFormat',
    'invoiceTerms',
    'invoiceNotes',
  ].forEach((field) => {
    if (hasOwn(payload, field)) {
      update[field] = normalizeText(payload[field]);
    }
  });

  if (hasOwn(payload, 'businessLogoAsset')) {
    const businessLogoAsset = normalizeImageAsset(payload.businessLogoAsset);

    update.businessLogoAsset = businessLogoAsset;
  }

  if (hasOwn(payload, 'gstin')) {
    update.gstin = normalizeGstin(payload.gstin);
  }

  if (hasOwn(payload, 'invoicePrefix')) {
    update.invoicePrefix = normalizeText(payload.invoicePrefix).toUpperCase() || defaultConfig.invoicePrefix;
  }

  if (hasOwn(payload, 'nextInvoiceNumber')) {
    const nextInvoiceNumber = Number(payload.nextInvoiceNumber);

    if (!Number.isInteger(nextInvoiceNumber) || nextInvoiceNumber < 1) {
      throw new ApiError(400, 'nextInvoiceNumber must be a positive integer');
    }

    update.nextInvoiceNumber = nextInvoiceNumber;
  }

  if (hasOwn(payload, 'useFinancialYearNumbering')) {
    update.useFinancialYearNumbering = normalizeBoolean(payload.useFinancialYearNumbering, 'useFinancialYearNumbering');
  }

  if (hasOwn(payload, 'defaultGstRate')) {
    update.defaultGstRate = normalizeRate(payload.defaultGstRate, 'defaultGstRate');
  }

  if (hasOwn(payload, 'shippingGstRate')) {
    update.shippingGstRate = normalizeRate(payload.shippingGstRate, 'shippingGstRate');
  }

  if (hasOwn(payload, 'shippingGstTreatment')) {
    const treatment = normalizeText(payload.shippingGstTreatment).toLowerCase();

    if (!Object.values(SHIPPING_GST_TREATMENTS).includes(treatment)) {
      throw new ApiError(400, `shippingGstTreatment must be one of: ${Object.values(SHIPPING_GST_TREATMENTS).join(', ')}`);
    }

    update.shippingGstTreatment = treatment;
  }

  if (hasOwn(payload, 'registeredAddress')) {
    update.registeredAddress = {
      ...defaultConfig.registeredAddress,
      ...normalizeAddress(payload.registeredAddress),
    };
  }

  if (hasOwn(payload, 'authorisedSignatory')) {
    update.authorisedSignatory = {
      ...defaultConfig.authorisedSignatory,
      ...normalizeSignatory(payload.authorisedSignatory),
    };
  }

  if (hasOwn(payload, 'bankDetails')) {
    update.bankDetails = {
      ...defaultConfig.bankDetails,
      ...normalizeBankDetails(payload.bankDetails),
    };
  }

  return update;
};

const updateGstConfiguration = async (actor, payload = {}) => {
  assertDatabaseReady();
  const update = normalizeConfigPayload(payload);

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'No GST configuration fields provided');
  }

  const previousConfig = await GstConfiguration.findOne({ singletonKey: 'default' }).lean().exec();
  const previousLogoPublicId = getImageAssetPublicId(previousConfig?.businessLogoAsset);
  let config;

  try {
    config = await GstConfiguration.findOneAndUpdate(
    { singletonKey: 'default' },
    {
      $set: {
        ...update,
        updatedBy: getActorId(actor),
      },
      $setOnInsert: {
        singletonKey: 'default',
      },
    },
    {
      new: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
    ).exec();
  } catch (error) {
    await cloudinaryService.deleteImages(getAddedCloudinaryPublicIds(
      [previousConfig?.businessLogoAsset],
      [update.businessLogoAsset],
    ));
    throw error;
  }

  const nextLogoPublicId = getImageAssetPublicId(config.businessLogoAsset);

  if (previousLogoPublicId && previousLogoPublicId !== nextLogoPublicId) {
    await cloudinaryService.deleteImage(previousLogoPublicId);
  }

  await GstActivityLog.create({
    action: 'gst_configuration.updated',
    actorId: getActorId(actor),
    entityId: config._id,
    entityType: 'GstConfiguration',
    metadata: {
      fields: Object.keys(update),
    },
  });

  return formatConfig(config);
};

export { defaultConfig, formatConfig, getGstConfiguration, updateGstConfiguration };

export default {
  defaultConfig,
  formatConfig,
  getGstConfiguration,
  updateGstConfiguration,
};
