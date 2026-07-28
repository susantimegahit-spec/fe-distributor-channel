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

  getSeries(date, CardCode = '') {
    const query = new URLSearchParams({ CustomQuery: date || '', CardCode: CardCode || '' }).toString();

    return DataService.get(`/sales-orders/series?${query}`);
  }

  postProductionOrder(payload) {
    return DataService.post('/production/orders', payload);
  }

  getProductionOrder(payload = {}) {
    return DataService.get('/production/orders', payload);
  }

  getProductionOrderById(id) {
    return DataService.get(`/production/orders/${id}`);
  }

  putBoms(id, payload) {
    return DataService.put(`/production/boms/${id}`, payload);
  }

  deleteBoms(id) {
    return DataService.delete(`/production/boms/${id}`);
  }
}

export default new ProductionServices();
