import { DataService } from '../../config/dataService';

class WarehouseServices {
  getBinHeader(CustomQuery = '') {
    return DataService.post('/warehouses/search-bin', { CustomQuery });
  }

  getBinDetails(CustomQuery = '', WhsCode = '') {
    return DataService.post('/warehouses/search-qty-bin', { CustomQuery, WhsCode });
  }

  getInventoryTransfer(From = '', To = '', WhsCode = '', ToWhsCode = '') {
    return DataService.get('/warehouses/inventory-transfer', {
      From,
      To,
      WhsCode,
      ToWhsCode
    });
  }

  getDetailInventoryTransfer(CustomQuery = '') {
    return DataService.post('/warehouses/inventory-transfer/get-by-id', {
      CustomQuery
    });
  }

  postInventory(payload) {
    return DataService.post('/warehouses/inventory-transfer', payload);
  }

  postCancelInventoryTransfer(DocEntry) {
    return DataService.post('/production/inventory-transfer/sap/cancel', {
      DocEntry
    });
  }
}

export default new WarehouseServices();
