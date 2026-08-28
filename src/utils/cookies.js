import Cookies from 'js-cookie';

const getCookies = (key) => {
  const data = Cookies.get(key);

  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};

const normalizeCustomerCode = (value) => {
  const normalizedValue = String(value ?? '').trim();

  return ['undefined', 'null'].includes(normalizedValue.toLowerCase()) ? '' : normalizedValue;
};

const getAssignedCustomerCodes = () => {
  const cookieValue = getCookies('customerCode');
  const values = Array.isArray(cookieValue) ? cookieValue : String(cookieValue ?? '').split(',');

  return [...new Set(values.map(normalizeCustomerCode).filter(Boolean))];
};

const getAssignedCustomerCode = () => getAssignedCustomerCodes().join(',');

const normalizeOrganizationAssignmentValues = (value) => {
  if (Array.isArray(value)) return [...new Set(value.flatMap(normalizeOrganizationAssignmentValues).filter(Boolean))];
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'object') {
    const nestedValue = value.value ?? value.code ?? value.whs_code ?? value.ocr_code ?? value.code_customer;
    return normalizeOrganizationAssignmentValues(nestedValue);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getOrganizationAssignment = () => {
  const assignment = getCookies('organization_assignment') || {};

  return {
    warehouses: normalizeOrganizationAssignmentValues(assignment.warehouses ?? getCookies('whs_code')),
    branches: normalizeOrganizationAssignmentValues(assignment.branches ?? getCookies('ocr_code')),
    business_units: normalizeOrganizationAssignmentValues(assignment.business_units ?? getCookies('ocr_code2')),
    departments: normalizeOrganizationAssignmentValues(assignment.departments ?? getCookies('ocr_code3')),
    expeditions: normalizeOrganizationAssignmentValues(assignment.expeditions ?? getCookies('expedition_code')),
    distributors: normalizeOrganizationAssignmentValues(assignment.distributors ?? getCookies('customerCode'))
  };
};

const getOrganizationAssignmentDefault = (key) => getOrganizationAssignment()[key]?.[0] || '';

const setCookies = (key, value) => {
  Cookies.set(key, value);
};

const removeCookies = (key) => {
  Cookies.remove(key);
};

export {
  getCookies,
  setCookies,
  removeCookies,
  normalizeCustomerCode,
  getAssignedCustomerCode,
  getAssignedCustomerCodes,
  getOrganizationAssignment,
  getOrganizationAssignmentDefault
};
