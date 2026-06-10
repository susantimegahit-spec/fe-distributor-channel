import { DataService } from "../config/dataService";


class ProductServices {
  getAllProduct(payload) {
    return DataService.get(`/items?search=${payload ?? ''}`);
  }

  syncProduct() {
    return DataService.post('/items/sync');
  }
}

export default new ProductServices();
