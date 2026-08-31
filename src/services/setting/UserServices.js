import { DataService } from '../../config/dataService';

class UserServices {
  // getAllUser() {
  //   return DataService.get(`/roles/${id}`);
  // }

  getAllUser() {
    return DataService.get('/users');
  }

  getUserDetail(id) {
    return DataService.get(`/users/${id}`);
  }

  postCreateUser(payload) {
    return DataService.post('/users', payload);
  }

  putEditUser(id, payload) {
    return DataService.put(`/users/${id}`, payload);
  }

  postChangePassword(payload) {
    return DataService.post('/auth/change-password', payload);
  }

  updateRole(id, roleData) {
    return DataService.put(`/roles/${id}`, roleData);
  }

  deleteUser(id) {
    return DataService.delete(`/users/${id}`);
  }

  deleteRole(id) {
    return DataService.delete(`/roles/${id}`);
  }
}

export default new UserServices();
