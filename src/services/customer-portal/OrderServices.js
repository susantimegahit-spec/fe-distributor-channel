import { DataService } from '../../config/dataService';

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

  getListOrders(params = {}, startDate = '', endDate = '', customerCode = '') {
    const filters =
      typeof params === 'string'
        ? { status: params, start_date: startDate, end_date: endDate, customer_code: customerCode }
        : params || {};
    const query = new URLSearchParams();

    ['status', 'start_date', 'end_date', 'customer_code'].forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query.set(key, filters[key]);
      }
    });

    const queryString = query.toString();

    return DataService.get(`/sales-orders${queryString ? `?${queryString}` : ''}`);
  }

  getListOrder(params = {}, startDate = '', endDate = '', customerCode = '') {
    return this.getListOrders(params, startDate, endDate, customerCode);
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

  getCheckEta(payload) {
    return DataService.get('/sales-orders/check-eta', payload);
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
    return DataService.post(`/sales-orders/${id}`, payload);
  }

  postOrderPosting(id, payload) {
    if (id) {
      return DataService.post(`/sales-orders/${id}/post-sap`, payload);
    } else {
      return DataService.post(`/sales-orders/post-sap`, payload);
    }
  }

  postArrived(id) {
    return DataService.post(`/sales-orders/${id}/arrive`);
  }

  postArrive(id) {
    return this.postArrived(id);
  }

  downloadPdf(id) {
    return DataService.getBlob(`/sales-orders/${id}/pdf`);
  }
}

export default new OrderServices();
