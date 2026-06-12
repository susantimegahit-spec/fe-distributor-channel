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

  getListOrder() {
    return DataService.get('/sales-orders');
  }

  getDetailOrder(id) {
    return DataService.get(`/sales-orders/${id}`);
  }

  getVats() {
    return DataService.get('/vats');
  }

  postOrder(payload) {
    console.log('payload => ', payload)
    return DataService.post('/sales-orders', payload);
  }

  putOrder(id, payload) {
    return DataService.put(`/sales-orders/${id}`, payload);
  }

  postOrderPosting(id, payload) {
    return DataService.post(`/sales-orders/${id}/post-sap`, payload);
  }
}

export default new OrderServices();
