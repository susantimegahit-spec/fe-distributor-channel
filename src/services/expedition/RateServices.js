import { DataService } from '../../config/dataService';

class RateServices {
  getRates(params = {}) {
    return DataService.get('ekspedisi/rates', params);
  }

  getRatesRank(origin, destination, weight, serviceType, transportMode) {
    return DataService.get('ekspedisi/rates/rank', {
      origin,
      destination,
      ...(Number(weight) > 0 ? { weight } : {}),
      service_type: serviceType,
      transport_mode: transportMode
    });
  }

  uploadRatesExcel(file, expeditionCode) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expedition_code', expeditionCode);

    return DataService.post('ekspedisi/rates/upload', formData);
  }

  updateRate(id, payload) {
    return DataService.put(`ekspedisi/rates/${id}`, payload);
  }

  deleteRate(id) {
    return DataService.delete(`ekspedisi/rates/${id}`);
  }
}

export default new RateServices();
