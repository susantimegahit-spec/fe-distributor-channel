import { DataService } from '../../config/dataService';

class WarehouseServices {
  getBinHeader(CustomQuery = '') {
    return DataService.post('/warehouses/search-bin', { CustomQuery });
  }

  getBinDetails(CustomQuery = '', WhsCode = '') {
    return DataService.post('/warehouses/search-qty-bin', { CustomQuery, WhsCode });
  }

  postInventory(payload) {
    return DataService.post('/warehouses/inventory-transfer', payload);
  }
}

export default new WarehouseServices();
