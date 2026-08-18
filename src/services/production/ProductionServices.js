import { DataService } from '../../config/dataService';

class ProductionServices {
  getBoms(payload = {}) {
    const { code = '', search = '' } = payload;

    return DataService.get('/production/boms', { code, search });
  }

  postBoms(payload) {
    return DataService.post('/production/boms', payload);
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

  getProductionOrder(payload = {}) {
    return DataService.get('/production/orders', payload);
  }

  getListOrderSap(payload = {}) {
    const { from = '', to = '', whs_code = '', to_whs_code = '' } = payload;

    return DataService.get('/production/get-list-pdo-sap', { from, to, whs_code, to_whs_code });
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

  getProductionIssueById(id) {
    return DataService.get(`/production/issues/${id}`);
  }

  postProductionIssue(payload) {
    return DataService.post('/production/issues', payload);
  }

  cancelProductionIssue(id) {
    return DataService.post(`/production/issues/${id}/cancel`);
  }

  putBoms(id, payload) {
    return DataService.put(`/production/boms/${id}`, payload);
  }

  deleteBoms(id) {
    return DataService.delete(`/production/boms/${id}`);
  }
}

export default new ProductionServices();
