import { DataService } from '../../config/dataService';

class DashboardLayoutServices {
  putDashboardLayout(roleId, payload) {
    return DataService.put(`dashboard-layouts/roles/${encodeURIComponent(roleId)}`, payload);
  }
}

export default new DashboardLayoutServices();
