import { DataService } from '../../config/dataService';

class RateServices {
  getRates(params = {}) {
    return DataService.get('ekspedisi/rates', params);
  }

  getRatesRank(origin, destination, weight, serviceType) {
    return DataService.get('ekspedisi/rates/rank', {
      origin,
      destination,
      weight,
      service_type: serviceType
    });
  }

  uploadRatesExcel(file, expeditionCode) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expedition_code', expeditionCode);

    return DataService.post('ekspedisi/rates/upload', formData);
  }

  deleteRate(id) {
    return DataService.delete(`ekspedisi/rates/${id}`);
  }
}

export default new RateServices();
