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

  syncAllOrders() {
    return DataService.post('/sales-orders/sync-all');
  }

  getSalesOrderSeries(date) {
    const query = new URLSearchParams({ CustomQuery: date || '' }).toString();

    return DataService.get(`/sales-orders/series?${query}`);
  }

  getCreditLimit(customerCode) {
    const query = new URLSearchParams({ CustomQuery: customerCode || '' }).toString();

    return DataService.get(`/sales-orders/credit-limit?${query}`);
  }

  getDetailOrder(id) {
    return DataService.get(`/sales-orders/${id}`);
  }

  getVats() {
    return DataService.get('/vats');
  }

  getMaxDiscount() {
    return DataService.get('/sales-orders/max-discount');
  }

  postOrder(payload) {
    return DataService.post('/sales-orders', payload);
  }

  putOrder(id, payload) {
    return DataService.put(`/sales-orders/${id}`, payload);
  }

  postOrderPosting(id, payload) {
    if (id) {
      return DataService.post(`/sales-orders/${id}/post-sap`, payload);
    } else {
      return DataService.post(`/sales-orders/post-sap`, payload);
    }
  }

  downloadPdf(id) {
    return DataService.getBlob(`/sales-orders/${id}/pdf`);
  }
}

export default new OrderServices();
