import { DataService } from '../../config/dataService';

class LoadingRateServices {
  getLoadingRates(params = {}) {
    return DataService.get('ekspedisi/loading-rates', params);
  }

  postLoadingRates(payload) {
    return DataService.post('ekspedisi/loading-rates', payload);
  }

  postUploadLoadingRate(file) {
    const formData = new FormData();
    formData.append('file', file);

    return DataService.post('ekspedisi/loading-rates/upload', formData);
  }

  getDownloadTemplateLoadingRate() {
    return DataService.getBlob('ekspedisi/loading-rates/template');
  }
}

export default new LoadingRateServices();
