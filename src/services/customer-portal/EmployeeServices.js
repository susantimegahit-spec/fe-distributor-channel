import { DataService } from '../../config/dataService';

class EmployeeServices {
  getAllEmployee(payload) {
    return DataService.get(`/sales-employees?search=${payload}`);
  }

  syncEmployee() {
    return DataService.post('/sales-employees/sync');
  }

  createEmployee(payload) {
    return DataService.post('/sales-employees', payload);
  }

  getSalesDistributor(payload) {
    return DataService.get(`/sales-distributors?search=${payload?.keywords}&code_customer=${payload?.codeCustomer}`);
  }

  postSalesDistributor(payload) {
    return DataService.post('/sales-distributors', payload);
  }

  putSalesDistributor(id, payload) {
    return DataService.put(`/sales-distributors/${id}`, payload);
  }

  deleteSalesDistributor(id) {
    return DataService.delete(`/sales-distributors/${id}`);
  }
}

export default new EmployeeServices();
