import { DataService } from '../../config/dataService';
import { getOrganizationAssignment } from '../../utils/cookies';

const getAssignedProductionUnit = (requestedUnit = '') => {
  const assignedUnits = getOrganizationAssignment().units;
  if (!assignedUnits.length) return requestedUnit;

  const normalizedRequestedUnit = String(requestedUnit ?? '').trim();
  if (normalizedRequestedUnit && assignedUnits.includes(normalizedRequestedUnit)) return normalizedRequestedUnit;

  return assignedUnits.join(',');
};

class ProductionServices {
  getUnit() {
    return DataService.get('/production/get-unit');
  }

  getItemStock(payload = {}) {
    const { CustomQuery = '', item_codes = [], WhsCode = '' } = payload;
    const data = { WhsCode };

    if (CustomQuery) data.CustomQuery = CustomQuery;
    if (Array.isArray(item_codes) && item_codes.length) data.item_codes = item_codes;

    return DataService.post('/warehouses/stock-by-item', data);
  }

  searchBin(payload = {}) {
    const { CustomQuery = '' } = payload;

    return DataService.post('/warehouses/search-bin', { CustomQuery });
  }

  getBoms(payload = {}) {
    const { code = '', search = '' } = payload;

    return DataService.get('/production/boms', { code, search });
  }

  postBoms(payload) {
    return DataService.post('/production/boms', payload);
  }

  putBoms(id, payload) {
    return DataService.put(`/production/boms/${id}`, payload);
  }

  postUploadBomsExcel(file) {
    const formData = new FormData();
    formData.append('file', file);

    return DataService.post('/production/boms/upload-excel', formData);
  }

  getBomsById(id) {
    return DataService.get(`/production/boms/${id}`);
  }

  getSeries(date, CardCode = '202') {
    const query = new URLSearchParams({ CustomQuery: date || '', CardCode: CardCode || '' }).toString();

    return DataService.get(`/sales-orders/series?${query}`);
  }

  postProductionOrder(payload) {
    return DataService.post('/production/orders/sap', payload);
  }

  putProductionOrder(id, payload) {
    return DataService.put(`/production/orders/${id}`, payload);
  }

  getProductionOrder(payload = {}) {
    return DataService.get('/production/orders', payload);
  }

  getChangeProduct(search = '') {
    return DataService.get('/production/change-products', { search: String(search ?? '').trim() });
  }

  postDraftChangeProduct(payload) {
    return DataService.post('/production/change-products', payload);
  }

  getChangeProductById(id) {
    return DataService.get(`/production/change-products/${id}`);
  }

  putChangeProduct(id, payload) {
    return DataService.put(`/production/change-products/${id}`, payload);
  }

  postChangeProduct(id) {
    return DataService.post(`/production/change-products/${id}/post`);
  }

  getListOrderSap(payload = {}) {
    const { from = '', to = '', whs_code = '', to_whs_code = '', status = '', unit = '' } = payload;
    const productionUnit = getAssignedProductionUnit(unit);

    return DataService.get('/production/get-list-pdo-sap', {
      from,
      to,
      whs_code,
      to_whs_code,
      status,
      unit: productionUnit,
      u_unit: productionUnit
    });
  }

  getProductionOrderById(id) {
    return DataService.get(`/production/orders/sap/${id}`);
  }

  cancelProductionOrder(id) {
    return DataService.post(`/production/orders/${id}/cancel`);
  }

  postCancelProductionOrder(payload = {}) {
    const { DocEntry = '', UserId = '', AddonId = '' } = payload;

    return DataService.post('/production/orders/sap/cancel', { DocEntry, UserId, AddonId });
  }

  closeProductionRelease(payload = {}) {
    const { DocEntry = '' } = payload;

    return DataService.post('/production/close-pdo-sap', { DocEntry: String(DocEntry) });
  }

  getProductionReceipts(payload = {}) {
    return DataService.get('/production/receipts', payload);
  }

  getProductionReceiptById(id) {
    return DataService.get(`/production/receipts/${id}`);
  }

  getReceipt(payload = {}) {
    const { from = '', to = '', whs_code = '', to_whs_code = '' } = payload;

    return DataService.get('/production/receipts/sap-list', { from, to, whs_code, to_whs_code });
  }

  getReceiptDetail(id) {
    return DataService.get(`/production/receipts/sap/${id}`);
  }

  postReceipt(payload) {
    return DataService.post('/production/add-receipt-prod-sap', payload);
  }

  postProductionReceipt(payload) {
    return DataService.post('/production/receipts', payload);
  }

  cancelProductionReceipt(id) {
    return DataService.post(`/production/receipts/${id}/cancel`);
  }

  getProductionIssues(payload = {}) {
    return DataService.get('/production/issues', payload);
  }

  getIssueProduction(payload = {}) {
    const { from = '', to = '', whs_code = '', to_whs_code = '' } = payload;

    return DataService.get('/production/issues/sap-list', { from, to, whs_code, to_whs_code });
  }

  getIssueProductionDetail(id) {
    return DataService.get(`/production/issues/sap/${id}`);
  }

  postIssueProduction(payload) {
    return DataService.post('/production/add-issue-prod-sap', payload);
  }

  getProductionIssueById(id) {
    return DataService.get(`/production/issues/${id}`);
  }

  postProductionIssue(payload) {
    return DataService.post('/production/issues', payload);
  }

  cancelProductionIssue(id) {
    return DataService.post(`/production/issues/${id}/cancel`);
  }

  deleteBoms(id) {
    return DataService.delete(`/production/boms/${id}`);
  }
}

export default new ProductionServices();
