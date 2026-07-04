import { DataService } from '../config/dataService';

class PromoServices {
  getAllPromo() {
    return DataService.get('/claims/programs');
  }

  getProgramDetail(id) {
    return DataService.get(`/claims/programs/${id}`);
  }

  postPromo(payload) {
    return DataService.post('/claims/programs', payload);
  }

  updateProgram(id, payload) {
    return DataService.put(`/claims/programs/${id}`, payload);
  }

  deleteProgram(id) {
    return DataService.delete(`/claims/programs/${id}`);
  }

  uploadTransactionFile(payload) {
    return DataService.post('/claims/upload', payload);
  }

  getUploadResult(batchId) {
    return DataService.get(`/claims/results?batch_id=${encodeURIComponent(batchId)}`);
  }

  getBatchDetail(id) {
    return DataService.get(`/claims/batches/${id}`);
  }

  getClaimBatches(payload = {}) {
    return DataService.get('/claims/batches', payload);
  }

  getListWithdraw(payload = {}) {
    return DataService.get('/claims/withdraws', payload);
  }

  getTotalReward(payload = {}) {
    return DataService.get('/claims/reward-summary', payload);
  }

  postWithdraw(payload) {
    return DataService.post('/claims/withdraws', payload);
  }

  postWithdraws(payload) {
    return this.postWithdraw(payload);
  }

  postVerify(payload) {
    return DataService.post('/claims/results/verify', payload);
  }

  postVerifyWithdraw(id, payload) {
    return DataService.post(`/claims/withdraws/${id}/status`, payload);
  }
}

export default new PromoServices();
