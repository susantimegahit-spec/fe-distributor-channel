import { DataService } from '../config/dataService';

class OrderServices {
  // getAllUser() {
  //   return DataService.get(`/roles/${id}`);
  // }
  postDiscount(payload) {
    return DataService.post('/discounts/sap', payload);
  }

  getDiscType() {
    return DataService.get('/discounts/types');
  }

  postOrder(payload) {
    return DataService.post('/sales-orders', payload);
  }

}

export default new OrderServices();
