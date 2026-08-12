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

  getProductionOrderById(id) {
    return DataService.get(`/production/orders/${id}`);
  }

  getProductionReceipts(payload = {}) {
    return DataService.get('/production/receipts', payload);
  }

  getProductionReceiptById(id) {
    return DataService.get(`/production/receipts/${id}`);
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
