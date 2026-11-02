const QUOTATIONS_STORAGE_KEY = 'dc-public-quotations-v1';
const OFFERS_STORAGE_KEY = 'dc-public-quotation-offers-v1';

const readStorage = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const createQuotationToken = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '');
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('') || `${Date.now()}${Math.random().toString(36).slice(2)}`;
};

export const getPublicQuotations = () => readStorage(QUOTATIONS_STORAGE_KEY);

export const getPublicQuotation = (token) => getPublicQuotations().find((quotation) => quotation.token === token) || null;

export const createPublicQuotation = (items) => {
  const quotations = getPublicQuotations();
  const createdAt = new Date().toISOString();
  const quotation = {
    id: createQuotationToken(),
    token: createQuotationToken(),
    number: `RFQ-${createdAt.slice(0, 10).replaceAll('-', '')}-${String(quotations.length + 1).padStart(3, '0')}`,
    status: 'OPEN',
    createdAt,
    items
  };
  quotations.unshift(quotation);
  writeStorage(QUOTATIONS_STORAGE_KEY, quotations);
  return quotation;
};

export const getQuotationOffers = (quotationId) => readStorage(OFFERS_STORAGE_KEY).filter((offer) => offer.quotationId === quotationId);

export const submitQuotationOffer = (quotationId, payload) => {
  const offers = readStorage(OFFERS_STORAGE_KEY);
  offers.unshift({ id: createQuotationToken(), quotationId, submittedAt: new Date().toISOString(), ...payload });
  writeStorage(OFFERS_STORAGE_KEY, offers);
};
