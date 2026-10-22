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

  postPurchasing(payload) {
    return DataService.post('/purchasing-request/requests', payload);
  }

  postPurchaseRequest(payload) {
    return DataService.post('/purchasing-request/requests', payload);
  }

  getDetailPurchasing(id) {
    return DataService.get(`/purchasing-request/requests/${id}`);
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
