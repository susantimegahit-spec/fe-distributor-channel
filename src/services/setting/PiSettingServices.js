import { DataService } from '../../config/dataService';

class PiSettingServices {
  getSetting(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();

    return DataService.get(query ? `/pi-settings?${query}` : '/pi-settings');
  }

  updateSetting(formData) {
    return DataService.post('/pi-settings', formData);
  }
}

export default new PiSettingServices();
