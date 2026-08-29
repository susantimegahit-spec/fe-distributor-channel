import { DataService } from '../../config/dataService';

class WarehouseServices {
  getAllWarehouse(payload) {
    return DataService.get(`/warehouses?search=${payload}`);
  }

  getWarehouseByUnit(masterUnitId) {
    return DataService.get('/warehouses', { master_unit_id: masterUnitId });
  }

  syncWarehouse() {
    return DataService.post('/warehouses/sync');
  }

  updateWarehouse(id, payload) {
    return DataService.put(`/warehouses/${id}`, payload);
  }
}

export default new WarehouseServices();
