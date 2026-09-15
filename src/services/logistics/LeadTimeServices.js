import { DataService } from '../../config/dataService';

class LeadTimeServices {
  getLeadTimes(params = {}) {
    return DataService.get('ekspedisi/leadtimes', params);
  }

  postLeadTime(payload) {
    return DataService.post('ekspedisi/leadtimes', payload);
  }

  putLeadTime(id, payload) {
    return DataService.put(`ekspedisi/leadtimes/${id}`, payload);
  }

  deleteLeadTime(id) {
    return DataService.delete(`ekspedisi/leadtimes/${id}`);
  }
}

export default new LeadTimeServices();
