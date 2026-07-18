import { DataService } from '../../config/dataService';

class DashboardServices {
  getAdminSummary() {
    return DataService.get('/dashboard/admin/summary');
  }

  getAdminChart() {
    return DataService.get('/dashboard/admin/charts');
  }

  getDistributorSummary() {
    return DataService.get('/dashboard/distributor/summary');
  }

  getDistributorChart() {
    return DataService.get('/dashboard/distributor/charts');
  }

  postDataTarget(payload) {
    return DataService.post('/sales-dashboard/upload', payload);
  }

  getDataTarget(customer_code, year, depo) {
    return DataService.get('/sales-dashboard/raw-data', { customer_code, year, depo });
  }
}

export default new DashboardServices();
