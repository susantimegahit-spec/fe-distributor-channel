import { DataService } from "../config/dataService";

class PiSettingServices {
  getSetting() {
    return DataService.get('/pi-settings');
  }

  updateSetting(formData) {
    return DataService.post('/pi-settings', formData);
  }
}

export default new PiSettingServices();
