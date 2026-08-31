import { DataService } from '../../config/dataService';

class NotificationSettingServices {
  getSettings() {
    return DataService.get('/notifications/settings');
  }

  updateSettings(payload) {
    return DataService.put('/notifications/settings', payload);
  }

  connectTelegram() {
    return DataService.get('/notifications/telegram/connect-link');
  }
}

export default new NotificationSettingServices();
