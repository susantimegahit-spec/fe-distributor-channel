import { DataService } from '../../config/dataService';

class RateTypeServices {
  getLoadingRateType(params = {}) {
    return DataService.get('ekspedisi/loading-rate-types', params);
  }

  postLoadingRateType(payload) {
    return DataService.post('ekspedisi/loading-rate-types', payload);
  }

  putLoadingRateType(id, payload) {
    return DataService.put(`ekspedisi/loading-rate-types/${id}`, payload);
  }

  deleteLoadingRateType(id) {
    return DataService.delete(`ekspedisi/loading-rate-types/${id}`);
  }
}

export default new RateTypeServices();
