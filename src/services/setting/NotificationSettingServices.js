import { DataService } from '../../config/dataService';

class NotificationSettingServices {
  getSettings() {
    return DataService.get('/notifications/settings');
  }

  updateSettings(payload) {
    return DataService.put('/notifications/settings', payload);
  }

  postConnectTelegram(payload) {
    return DataService.post('/notifications/telegram/recipients', payload);
  }
}

export default new NotificationSettingServices();
