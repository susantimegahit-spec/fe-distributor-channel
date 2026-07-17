import { DataService } from '../../config/dataService';


class WarehouseServices {
  getAllWarehouse(payload) {
    return DataService.get(`/warehouses?search=${payload}`);
  }

  syncWarehouse() {
    return DataService.post('/warehouses/sync');
  }
}

export default new WarehouseServices();
