import { DataService } from '../../config/dataService';

class BudgetingServices {
  getBudget(department = '', periode_year = '', search = '') {
    return DataService.get('/budgeting/master-budgets', {
      department,
      periode_year,
      search
    });
  }

  postBudget(data) {
    return DataService.post('/budgeting/master-budgets', data);
  }

  putBudget(id, data) {
    return DataService.put(`/budgeting/master-budgets/${id}`, data);
  }

  deleteBudget(id) {
    return DataService.delete(`/budgeting/master-budgets/${id}`);
  }
}

export default new BudgetingServices();
