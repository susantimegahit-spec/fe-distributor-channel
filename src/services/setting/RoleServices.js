import { DataService } from '../../config/dataService';

class RoleServices {
  fetchRole(id) {
    return DataService.get(`/roles/${id}`);
  }

  fetchAllRoles() {
    return DataService.get('/roles');
  }

  getMasterApproval() {
    return DataService.get('/master-approvals');
  }

  getApprovalStage() {
    return DataService.get('/master-approvals/stages');
  }

  postCreateRole(payload) {
    return DataService.post('/roles', payload);
  }

  putEditRole(id, roleData) {
    return DataService.put(`/roles/${id}`, roleData);
  }

  deleteRole(id) {
    return DataService.delete(`/roles/${id}`);
  }
}

export default new RoleServices();
