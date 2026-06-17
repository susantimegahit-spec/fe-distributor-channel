import { DataService } from '../config/dataService';

class NotificationServices {
  getNotifications() {
    return DataService.get('/notifications');
  }

  markAsRead(id) {
    return DataService.post(`/notifications/${id}/read`);
  }

  markAllAsRead() {
    return DataService.post('/notifications/read-all');
  }
}

export default new NotificationServices();
