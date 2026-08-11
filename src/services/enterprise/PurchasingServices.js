import { DataService } from '../../config/dataService';

class PurchasingServices {
  getPurchasing(department = '', cost_center = '', status = '', search = '') {
    return DataService.get('/purchasing-request/requests', {
      department,
      cost_center,
      status,
      search
    });
  }

  postPurchasing(payload) {
    return DataService.post('/purchasing-request/requests', payload);
  }

  getDetailPurchasing(id) {
    return DataService.get(`/purchasing-request/requests/${id}`);
  }

  putPurchasing(id, payload) {
    return DataService.put(`/purchasing-request/requests/${id}`, payload);
  }

  deletePurchasing(id) {
    return DataService.delete(`/purchasing-request/requests/${id}`);
  }
}

export default new PurchasingServices();
