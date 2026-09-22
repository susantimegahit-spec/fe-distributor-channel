import { DataService } from '../../config/dataService';

class LogisticsServices {
  getRescheduleLog(id) {
    return DataService.get(`logistic/orders/${encodeURIComponent(id)}/logs`);
  }

  getLogisticOrders({ search = '', per_page = 10, page = 1, logistic_status = '' } = {}) {
    return DataService.get('logistic/orders', {
      search,
      per_page,
      page,
      ...(logistic_status ? { logistic_status } : {})
    });
  }

  postApproveOrdersPacking(id) {
    return DataService.post(`logistic/orders/${id}/approve`);
  }

  postRescheduleOrder(id, payload) {
    return DataService.post(`logistic/orders/${id}/reschedule`, payload);
  }

  postPicklist(payload) {
    return DataService.post('logistic/picklists', payload);
  }

  getPicklist({ search = '', per_page = 10, page = 1 } = {}) {
    return DataService.get('logistic/picklists', {
      search,
      per_page,
      page
    });
  }

  getDetailPicklist(id) {
    return DataService.get(`logistic/picklists/${encodeURIComponent(id)}`);
  }
}

export default new LogisticsServices();
