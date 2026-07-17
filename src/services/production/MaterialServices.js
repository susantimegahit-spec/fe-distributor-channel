import { DataService } from '../../config/dataService';

class MaterialServices {
  getMaterial(search = '') {
    return DataService.get(`/production/items?search=${encodeURIComponent(search ?? '')}`);
  }

  getSyncItem() {
    return DataService.post('/production/items/sync');
  }
}

export default new MaterialServices();
