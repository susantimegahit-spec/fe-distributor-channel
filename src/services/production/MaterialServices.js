import { DataService } from '../../config/dataService';

class MaterialServices {
  getMaterial(search = '') {
    const params = new URLSearchParams({
      search: search ?? '',
      sales_item_status: 'Y',
      purchase_item_status: 'Y',
      inventory_item_status: 'Y'
    });

    return DataService.get(`items?${params.toString()}`);
  }

  getSyncItem() {
    return DataService.post('/production/items/sync');
  }
}

export default new MaterialServices();
