import { DataService } from "../config/dataService";


class UserServices {
  // getAllUser() {
  //   return DataService.get(`/roles/${id}`);
  // }

  getAllUser() {
    return DataService.get('/users');
  }

  postChangePassword(payload) {
    return DataService.post('/auth/change-password', payload);
  }

  updateRole(id, roleData) {
    return DataService.put(`/roles/${id}`, roleData);
  }

  deleteRole(id) {
    return DataService.delete(`/roles/${id}`);
  }
}

export default new UserServices();
