import { DataService } from '../../config/dataService';

class PurchasingServices {
  getDepartment() {
    return DataService.get('/purchasing-request/departments');
  }

  getSeries(date, cardCode = '') {
    const query = new URLSearchParams({ CustomQuery: date || '', CardCode: cardCode || '' }).toString();

    return DataService.get(`/sales-orders/series?${query}`);
  }

  getPurchasing(department = '', cost_center = '', status = '', search = '') {
    return DataService.get('/purchasing-request/requests', {
      department,
      cost_center,
      status,
      search
    });
  }

  getPurchaseRequest(department = '', costCenter = '', status = '', search = '', perPage = 15, page = 1) {
    return DataService.get('/purchasing-request/requests', {
      department,
      cost_center: costCenter,
      status,
      search,
      per_page: perPage,
      page
    });
  }

  getDraftPr({ CustomQuery = '', UserId = '', From = '', To = '', Status = '' } = {}) {
    return DataService.get('/purchasing-request/draft-pr', {
      CustomQuery,
      UserId,
      From,
      To,
      Status
    });
  }

  getGeneratedPr({ CustomQuery = '', From = '', To = '' } = {}) {
    return DataService.get('/purchasing-request/generated', {
      CustomQuery,
      From,
      To
    });
  }

  getQuotations({ search = '', status = '', from = '', to = '', per_page = 15, page = 1 } = {}) {
    return DataService.get('/purchasing-request/quotations', { search, status, from, to, per_page, page });
  }

  getDetailQuotations(id) {
    return DataService.get(`/purchasing-request/quotations/${encodeURIComponent(id)}`);
  }

  getListOffer(quotationId) {
    return DataService.get(`/purchasing-request/quotations/${encodeURIComponent(quotationId)}/offers`);
  }

  postQuotations(payload) {
    return DataService.post('/purchasing-request/quotations', payload);
  }

  deleteQuotations(id) {
    return DataService.delete(`/purchasing-request/quotations/${encodeURIComponent(id)}`);
  }

  postOffers(token, payload) {
    return DataService.post(`/public/quotations/${encodeURIComponent(token)}/offers`, payload);
  }

  getPurchaseOrders(params = {}) {
    return DataService.get('/purchasing-request/purchase-orders', params);
  }

  postPurchaseOrder(payload) {
    return DataService.post('/purchasing-request/purchase-orders', payload);
  }

  postPurchasing(payload) {
    return DataService.post('/purchasing-request/requests', payload);
  }

  postPurchaseRequest(payload) {
    return DataService.post('/purchasing-request/requests', payload);
  }

  getPurchaseRequestDetail(id) {
    return DataService.get(`/purchasing-request/requests/${encodeURIComponent(id)}`);
  }

  getDetailPR(docEntry) {
    return DataService.get('/purchasing-request/detail-pr', {
      CustomQuery: String(docEntry ?? '')
    });
  }

  getDetailPurchasing(id) {
    return this.getPurchaseRequestDetail(id);
  }

  putPurchasing(id, payload) {
    return DataService.put(`/purchasing-request/requests/${id}`, payload);
  }

  updatePurchaseRequestStatus(id, status) {
    return DataService.post(`/purchasing-request/requests/${id}/status`, { status });
  }

  deletePurchasing(id) {
    return DataService.delete(`/purchasing-request/requests/${id}`);
  }
}

export default new PurchasingServices();
