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
}

export default new DashboardServices();
