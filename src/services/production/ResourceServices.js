import { DataService } from '../../config/dataService';

class ResourceServices {
  getResource(search = '') {
    return DataService.get(`/production/resources?search=${encodeURIComponent(search ?? '')}`);
  }

  getResourceSync() {
    return DataService.post('/production/resources/sync');
  }
}

export default new ResourceServices();
