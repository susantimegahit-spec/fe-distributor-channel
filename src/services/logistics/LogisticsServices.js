import { DataService } from '../../config/dataService';

class LogisticsServices {
  getLogisticOrders({ search = '', per_page = 10, page = 1 } = {}) {
    return DataService.get('logistic/orders', { search, per_page, page });
  }

  postApproveOrdersPacking(id) {
    return DataService.post(`logistic/orders/${id}/approve`);
  }

  postRescheduleOrder(id, payload) {
    return DataService.post(`logistic/orders/${id}/reschedule`, payload);
  }
}

export default new LogisticsServices();
