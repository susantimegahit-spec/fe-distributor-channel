import { DataService } from '../../config/dataService';

class RecruitmentServices {
  getListCandidate(params = {}) {
    const { status = '', position_applied = '', search = '', page = 1, per_page = 15 } = params;

    return DataService.get('/hr/recruitment/candidates', {
      status,
      position_applied,
      search,
      page,
      per_page
    });
  }
}

export default new RecruitmentServices();
