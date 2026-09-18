import { DataService } from '../../config/dataService';

class ExpeditionServices {
  getProvinces() {
    return DataService.get('ekspedisi/wilayah/provinces');
  }

  getCities(provinceId) {
    return DataService.get('ekspedisi/wilayah/regencies', { province_id: provinceId });
  }

  getExpeditions(payload = {}) {
    return DataService.get('ekspedisi/expeditions', payload);
  }

  getVehicle() {
    return DataService.get('ekspedisi/kendaraan');
  }

  getDriver() {
    return DataService.get('ekspedisi/sopir');
  }

  getChecker() {
    return DataService.get('ekspedisi/nama-checker');
  }

  getDetailExpedition(id) {
    return DataService.get(`ekspedisi/expeditions/${id}`);
  }

  postExpedition(payload) {
    return DataService.post('ekspedisi/expeditions', payload);
  }

  updateExpedition(id, payload) {
    return DataService.put(`ekspedisi/expeditions/${id}`, payload);
  }

  deleteExpedition(id) {
    return DataService.delete(`ekspedisi/expeditions/${id}`);
  }
}

export default new ExpeditionServices();
