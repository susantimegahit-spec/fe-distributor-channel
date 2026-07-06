import { DataService } from '../config/dataService';

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
}

export default new DashboardServices();
