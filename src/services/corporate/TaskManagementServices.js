import { DataService } from '../../config/dataService';

const query = (params = {}) => {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([key, item]) => {
    if (item !== undefined && item !== null && item !== '') value.set(key, item);
  });
  const result = value.toString();
  return result ? `?${result}` : '';
};

class TaskManagementServices {
  getTask(payload = {}) {
    const params = {
      space_id: payload.space_id,
      folder_id: payload.folder_id,
      list_id: payload.list_id,
      assignee_id: payload.assignee_id,
      status_id: payload.status_id,
      status_category: payload.status_category,
      parent_task_id: payload.parent_task_id,
      include_subtasks: payload.include_subtasks,
      search: payload.search,
      per_page: payload.per_page
    };
    return DataService.get(`/task-management/tasks${query(params)}`);
  }
  getTasks(payload = {}) {
    return this.getTask(payload);
  }
  getWidgetTask(payload = {}) {
    const params = {
      workspace_id: payload.workspace_id,
      space_id: payload.space_id,
      department_id: payload.department_id,
      folder_id: payload.folder_id,
      list_id: payload.list_id,
      employee_id: payload.employee_id,
      date_from: payload.date_from,
      date_to: payload.date_to
    };
    return DataService.get(`/task-management/dashboard/summary${query(params)}`);
  }
  getTaskStaffSummary(payload = {}) {
    const params = {
      space_id: payload.space_id,
      department_id: payload.department_id,
      employee_id: payload.employee_id,
      search: payload.search,
      include_tasks: payload.include_tasks,
      date_from: payload.date_from,
      date_to: payload.date_to
    };
    return DataService.get(`/task-management/dashboard/team-view${query(params)}`);
  }
  getDetailStatsTask(employeeId, payload = {}) {
    const params = {
      space_id: payload.space_id,
      department_id: payload.department_id,
      include_tasks: payload.include_tasks,
      date_from: payload.date_from,
      date_to: payload.date_to
    };
    return DataService.get(`/task-management/dashboard/team-view/${employeeId}${query(params)}`);
  }
  createTask(payload) {
    return DataService.post('/task-management/tasks', payload);
  }
  getTaskDetail(id) {
    return DataService.get(`/task-management/tasks/${id}`);
  }
  updateTask(id, payload) {
    return DataService.put(`/task-management/tasks/${id}`, payload);
  }
  putEditTask(id, payload) {
    return DataService.put(`/task-management/tasks/${id}`, payload);
  }
  deleteTask(id) {
    return DataService.delete(`/task-management/tasks/${id}`);
  }
  changeStatus(id, statusId) {
    return DataService.post(`/task-management/tasks/${id}/status`, { status_id: statusId });
  }
  getMetrics(params) {
    return DataService.get(`/task-management/tasks/metrics${query(params)}`);
  }

  getWorkspaces() {
    return DataService.get('/task-management/workspaces');
  }
  getWorkspace(id) {
    return DataService.get(`/task-management/workspaces/${id}`);
  }
  createWorkspace(payload) {
    return DataService.post('/task-management/workspaces', payload);
  }
  getSpaces(params) {
    return DataService.get(`/task-management/spaces${query(params)}`);
  }
  getSpace(id) {
    return DataService.get(`/task-management/spaces/${id}`);
  }
  createSpace(payload) {
    return DataService.post('/task-management/spaces', payload);
  }
  getFolders(params) {
    return DataService.get(`/task-management/folders${query(params)}`);
  }
  createFolder(payload) {
    return DataService.post('/task-management/folders', payload);
  }
  postCreateFolder(payload) {
    return DataService.post('/task-management/folders', payload);
  }
  deleteTaskFolder(id) {
    return DataService.delete(`/task-management/folders/${id}`);
  }
  getLists(params) {
    return DataService.get(`/task-management/lists${query(params)}`);
  }
  createList(payload) {
    return DataService.post('/task-management/lists', payload);
  }
  postListTask(payload) {
    return DataService.post('/task-management/lists', payload);
  }

  createChecklist(payload) {
    return DataService.post('/task-management/checklists', payload);
  }
  deleteChecklist(id) {
    return DataService.delete(`/task-management/checklists/${id}`);
  }
  createChecklistItem(checklistId, payload) {
    return DataService.post(`/task-management/checklists/${checklistId}/items`, payload);
  }
  toggleChecklistItem(id) {
    return DataService.post(`/task-management/checklist-items/${id}/toggle`);
  }
  deleteChecklistItem(id) {
    return DataService.delete(`/task-management/checklist-items/${id}`);
  }

  getActiveTimer() {
    return DataService.get('/task-management/time-tracking/active');
  }
  startTimer(payload) {
    return DataService.post('/task-management/time-tracking/start', payload);
  }
  stopTimer(id) {
    return DataService.post(`/task-management/time-tracking/${id}/stop`);
  }
  createManualTime(payload) {
    return DataService.post('/task-management/time-tracking/manual', payload);
  }

  getComments(taskId) {
    return DataService.get(`/task-management/tasks/${taskId}/comments`);
  }
  postCommentTask(taskId, { comment_text, parent_comment_id = null, is_internal_only = false }) {
    return DataService.post(`/task-management/tasks/${taskId}/comments`, {
      comment_text,
      parent_comment_id,
      is_internal_only
    });
  }
  createComment(taskId, payload) {
    return this.postCommentTask(taskId, payload);
  }

  getStatuses(params) {
    return DataService.get(`/task-management/master/statuses${query(params)}`);
  }
  getPriorities() {
    return DataService.get('/task-management/master/priorities');
  }
  getTaskTypes() {
    return DataService.get('/task-management/master/task-types');
  }
  getTags(params) {
    return DataService.get(`/task-management/master/tags${query(params)}`);
  }
  getDepartments() {
    return DataService.get('/task-management/master/departments');
  }
  getStaff(params) {
    return DataService.get(`/task-management/master/employees${query(params)}`);
  }
  getStaffPositions(params) {
    return DataService.get(`/task-management/master/positions${query(params)}`);
  }
  addStaff(payload) {
    return DataService.post('/task-management/employees', payload);
  }
  getEmployee(params) {
    return this.getStaff(params);
  }
  getEmployees(params) {
    return this.getStaff(params);
  }
}

export default new TaskManagementServices();
