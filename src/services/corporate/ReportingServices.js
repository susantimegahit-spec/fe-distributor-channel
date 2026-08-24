import { DataService } from '../../config/dataService';

class ReportingServices {
  getAllTaskClickUp(payload = {}) {
    const { search = '', space_id = '', status = '', assignee = '', priority = '', start_date_from = '', due_date_to = '' } = payload;

    return DataService.get('/reporting/tasks/all', {
      search,
      space_id,
      status,
      assignee,
      priority,
      start_date_from,
      due_date_to
    });
  }

  getDetailTaskClickUp(id) {
    return DataService.get(`/reporting/tasks/${id}`);
  }

  syncTaskClickUp() {
    return DataService.post('/reporting/tasks/sync');
  }
}

export default new ReportingServices();
