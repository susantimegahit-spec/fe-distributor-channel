import { DataService } from "../config/dataService";


class EmployeeServices {
  getAllEmployee(payload) {
    return DataService.get(`/sales-employees?search=${payload}`);
  }

  syncEmployee() {
    return DataService.post('/sales-employees/sync');
  }
}

export default new EmployeeServices();
