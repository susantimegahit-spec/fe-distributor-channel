import { DataService } from '../../config/dataService';

class OriginServices {
  getOrigins(params = {}) {
    return DataService.get('ekspedisi/origins', params);
  }

  getOriginById(id) {
    return DataService.get(`ekspedisi/origins/${id}`);
  }

  postOrigin(payload) {
    return DataService.post('ekspedisi/origins', payload);
  }

  putOrigin(id, payload) {
    return DataService.put(`ekspedisi/origins/${id}`, payload);
  }

  deleteOrigin(id) {
    return DataService.delete(`ekspedisi/origins/${id}`);
  }

  uploadOrigins(file) {
    const formData = new FormData();

    formData.append('file', file);

    return DataService.post('ekspedisi/origins/upload', formData);
  }
}

export default new OriginServices();
