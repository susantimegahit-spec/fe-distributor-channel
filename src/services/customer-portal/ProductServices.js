import { DataService } from '../../config/dataService';

class ProductServices {
  getAllProduct(payload, salesItemStatus, purchaseItemStatus, inventoryItemStatus) {
    const params = new URLSearchParams({ search: payload ?? '' });

    if (salesItemStatus) {
      params.set('sales_item_status', salesItemStatus);
    }

    if (purchaseItemStatus) {
      params.set('purchase_item_status', purchaseItemStatus);
    }

    if (inventoryItemStatus) {
      params.set('inventory_item_status', inventoryItemStatus);
    }

    return DataService.get(`/items?${params.toString()}`);
  }

  getProductCustomer(payload) {
    return DataService.get(`/items?code_customer=${payload ?? ''}`);
  }

  getProductPrice(payload) {
    return DataService.get(`/distributor-item-prices?search=${payload ?? ''}`);
  }

  syncProduct() {
    return DataService.post('/items/sync');
  }
}

export default new ProductServices();
