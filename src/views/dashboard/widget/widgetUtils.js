export const getPayload = (response) => response?.data?.data ?? response?.data ?? response ?? {};

export const getRows = (response, keys = []) => {
  const payload = getPayload(response);
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'rows', ...keys]) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
  }
  return [];
};

export const getTotal = (response, rows = []) => {
  const payload = getPayload(response);
  const page = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const nestedPage = payload?.orders || payload?.picklists || payload?.registrations;
  return (
    Number(
      payload?.total ??
        payload?.meta?.total ??
        payload?.pagination?.total ??
        page?.total ??
        nestedPage?.total ??
        nestedPage?.meta?.total ??
        rows.length
    ) || 0
  );
};

export const findNumericValue = (source, keys) => {
  if (!source || typeof source !== 'object') return 0;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  for (const value of Object.values(source)) {
    if (value && typeof value === 'object') {
      const found = findNumericValue(value, keys);
      if (found) return found;
    }
  }
  return 0;
};

export const formatMetric = (value) => Number(value || 0).toLocaleString('id-ID');
