import { DataService } from '../config/dataService';

class NotificationServices {
  getNotifications() {
    return DataService.get('/notifications');
  }

  sendTestNotification(data = {}) {
    return DataService.post('/notifications/test', data);
  }

  markAsRead(id) {
    return DataService.post(`/notifications/${id}/read`);
  }

  markAllAsRead() {
    return DataService.post('/notifications/read-all');
  }
}

export default new NotificationServices();
