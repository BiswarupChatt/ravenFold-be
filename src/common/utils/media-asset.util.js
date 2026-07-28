const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeImageAsset = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const url = normalizeText(value.url);

  if (!url) {
    return null;
  }

  return {
    publicId: normalizeText(value.publicId || value.public_id),
    url,
  };
};

const normalizeImageAssets = (value, { maxItems = 20 } = {}) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set();
  const assets = [];

  for (const item of value) {
    const asset = normalizeImageAsset(item);

    if (!asset || seenUrls.has(asset.url)) {
      continue;
    }

    assets.push(asset);
    seenUrls.add(asset.url);

    if (assets.length >= maxItems) {
      break;
    }
  }

  return assets;
};

const getImageAssetUrl = (value) => normalizeImageAsset(value)?.url || '';

const getImageAssetPublicId = (value) => normalizeImageAsset(value)?.publicId || '';

const formatImageAsset = (value) => normalizeImageAsset(value);

const formatImageAssets = (value = []) => normalizeImageAssets(value);

const getRemovedCloudinaryPublicIds = (currentAssets = [], nextAssets = []) => {
  const nextPublicIds = new Set(
    normalizeImageAssets(nextAssets)
      .map((asset) => asset.publicId)
      .filter(Boolean),
  );

  return normalizeImageAssets(currentAssets)
    .map((asset) => asset.publicId)
    .filter((publicId) => publicId && !nextPublicIds.has(publicId));
};

const getAddedCloudinaryPublicIds = (currentAssets = [], nextAssets = []) => {
  const currentPublicIds = new Set(
    normalizeImageAssets(currentAssets)
      .map((asset) => asset.publicId)
      .filter(Boolean),
  );

  return normalizeImageAssets(nextAssets)
    .map((asset) => asset.publicId)
    .filter((publicId) => publicId && !currentPublicIds.has(publicId));
};

export {
  formatImageAsset,
  formatImageAssets,
  getAddedCloudinaryPublicIds,
  getImageAssetPublicId,
  getImageAssetUrl,
  getRemovedCloudinaryPublicIds,
  normalizeImageAsset,
  normalizeImageAssets,
};

export default {
  formatImageAsset,
  formatImageAssets,
  getAddedCloudinaryPublicIds,
  getImageAssetPublicId,
  getImageAssetUrl,
  getRemovedCloudinaryPublicIds,
  normalizeImageAsset,
  normalizeImageAssets,
};
