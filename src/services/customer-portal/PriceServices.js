import { DataService } from '../../config/dataService';

class PriceServices {
  getPriceByItem(payload) {
    return DataService.get(`/distributor-item-prices?search=${payload ?? ''}`);
  }

  postPrice(payload) {
    return DataService.post(`/distributor-item-prices`, payload);
  }

  getPriceDetail(id) {
    return DataService.get(`/distributor-item-prices/${id}`);
  }

  putPrice(id, payload) {
    return DataService.put(`/distributor-item-prices/${id}`, payload);
  }

  deletePrice(id) {
    return DataService.delete(`/distributor-item-prices/${id}`);
  }
}

export default new PriceServices();
