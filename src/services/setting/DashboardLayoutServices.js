import { DataService } from '../../config/dataService';

class DashboardLayoutServices {
  getDashboardLayout() {
    return DataService.get('dashboard-layouts/me');
  }

  putDashboardLayout(roleId, payload) {
    return DataService.put(`dashboard-layouts/roles/${encodeURIComponent(roleId)}`, payload);
  }
}

export default new DashboardLayoutServices();
