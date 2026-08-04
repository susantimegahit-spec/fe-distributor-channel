import { DataService } from '../../config/dataService';

class DestinationServices {
  getDestinations(params = {}) {
    return DataService.get('distributors/shiptos', params);
  }

  syncDestinations() {
    return DataService.post('distributors/shiptos/sync');
  }

  postUploadDestination(file) {
    const formData = new FormData();
    formData.append('file', file);

    return DataService.post('distributors/shiptos/upload', formData);
  }
}

export default new DestinationServices();
