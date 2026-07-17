import { DataService } from '../../config/dataService';


class ProductServices {
  getAllProduct(payload) {
    return DataService.get(`/items?search=${payload ?? ''}`);
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
