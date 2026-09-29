import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Select from 'react-select';

import TaskManagementServices from '../../../services/corporate/TaskManagementServices';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import { isAdministratorRole } from '../../../systems';
import { useAlert } from '../../../utils/alertContext';
import { useConfirm } from '../../../utils/confirmContext';
import { getCookies, getOrganizationAssignment } from '../../../utils/cookies';
import './to-do-list.scss';

const statusById = { 1: 'To Do', 2: 'In Progress', 3: 'In Review', 4: 'Done', 5: 'Cancelled' };
const priorityById = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };
const prioritySlaById = { 1: 4, 2: 24, 3: 72, 4: 168 };
const taskTypeById = { 1: 'Task', 2: 'Bug', 3: 'Feature', 4: 'Operational Routine', 5: 'Milestone' };
const statuses = Object.values(statusById);
const colorMap = {
  'To Do': '#64748b',
  'In Progress': '#2563eb',
  'In Review': '#d97706',
  Done: '#059669',
  Cancelled: '#dc2626'
};
const priorityVariant = { Urgent: 'danger', High: 'warning', Normal: 'primary', Low: 'secondary' };
const slaMap = { Urgent: '4 Jam', High: '24 Jam', Normal: '72 Jam', Low: '168 Jam' };

const initials = (name) =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const avatarColor = (name) => ['#4f46e5', '#0891b2', '#db2777', '#ea580c', '#059669'][name.length % 5];
const checklistProgress = (task) => {
  const total = task.checklist.length;
  const done = task.checklist.filter((item) => item.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
};
const isOverdue = (task) => task.status !== 'Done' && new Date(`${task.dueDate}T23:59:59`) < new Date();
const formatDate = (date) => {
  if (!date) return '-';
  const value = String(date).includes('T') ? new Date(date) : new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? '-' : value.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const toDateTimeLocal = (date) => {
  if (!date) return '';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};
const formatDuration = (minutes) => `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
const isCompletedTask = (task) => {
  const status = String(task?.status_category || task?.status || '').toLowerCase();
  return ['done', 'completed', 'complete', 'selesai'].includes(status);
};
const responseData = (response) => response?.data?.data ?? response?.data ?? null;
const responseList = (response) => {
  const data = responseData(response);
  if (Array.isArray(data)) return data;
  const rows = data?.data || data?.items || data?.rows || data?.results;
  return Array.isArray(rows) ? rows : [];
};
const apiError = (response) => response?.data?.success === false || (response?.status && response.status >= 400);
const displayText = (value, fallback = '-') => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return typeof fallback === 'string' || typeof fallback === 'number' ? String(fallback) : '-';
};
const folderColor = (value) => {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? color : '#4f46e5';
};
const entityName = (item, fallback = '-') => {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  return displayText(item?.name || item?.title || item?.label || item?.space_name || item?.folder_name || item?.list_name, fallback);
};
const statusLabel = (item, fallback = '-') => statusById[item?.id] || entityName(item, fallback);
const priorityLabel = (item, fallback = '-') => priorityById[item?.id] || entityName(item, fallback);
const taskTypeLabel = (item, fallback = '-') => taskTypeById[item?.id] || entityName(item, fallback);
const normalizeDepartment = (item, index) => ({
  id: item?.id ?? item?.ocr_code ?? `department-${index}`,
  code: String(item?.ocr_code ?? item?.ocrCode ?? item?.OcrCode ?? item?.code ?? '').trim(),
  name: item?.ocr_name ?? item?.ocrName ?? item?.OcrName ?? item?.name ?? '',
  status: Number(item?.status ?? item?.is_active ?? 1)
});
const spaceMatchesDepartment = (space, department) => {
  const references = [space?.department_id, space?.department_code, space?.ocr_code, space?.department?.id, space?.department?.code]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim().toLowerCase());
  return (
    references.includes(String(department.id).toLowerCase()) ||
    references.includes(department.code.toLowerCase()) ||
    entityName(space, '').toLowerCase().includes(department.name.toLowerCase())
  );
};
const normalizeApiTask = (task) => {
  const safeTask = task && typeof task === 'object' ? task : {};
  const checklists = Array.isArray(safeTask.checklists) ? safeTask.checklists : [];
  const checklist = checklists.flatMap((group) =>
    (Array.isArray(group?.items) ? group.items : Array.isArray(group?.checklist_items) ? group.checklist_items : []).map((item) => ({
      id: item.id,
      checklistId: group.id,
      text: displayText(item.item_text || item.text || item.title, '-'),
      done: Boolean(item.is_completed ?? item.completed ?? item.done)
    }))
  );
  const rawAssignees = Array.isArray(safeTask.assignees) ? safeTask.assignees : safeTask.assignee ? [safeTask.assignee] : [];
  const explicitAssigneeIds = Array.isArray(safeTask.assignee_ids) ? safeTask.assignee_ids : [];
  const assignees = rawAssignees.map((item) => entityName(item, item?.employee_name)).filter((item) => item && item !== '-');
  const statusObject = safeTask.status && typeof safeTask.status === 'object' ? safeTask.status : null;
  const priorityObject = safeTask.priority && typeof safeTask.priority === 'object' ? safeTask.priority : null;
  const statusId = statusObject?.id || safeTask.status_id;
  const priorityId = priorityObject?.id || safeTask.priority_id;
  const rawSubtasks = Array.isArray(safeTask.subtasks) ? safeTask.subtasks : [];
  return {
    ...safeTask,
    id: safeTask.id || safeTask.task_id,
    code: displayText(safeTask.task_code || safeTask.code, '-'),
    title: displayText(safeTask.title || safeTask.task_name, 'Tanpa judul'),
    description: displayText(safeTask.description, ''),
    status: statusById[statusId] || entityName(statusObject, displayText(safeTask.status, 'To Do')),
    statusId,
    priority: priorityById[priorityId] || entityName(priorityObject, displayText(safeTask.priority, 'Normal')),
    priorityId,
    type: entityName(safeTask.task_type, displayText(safeTask.type, 'Task')),
    assignees,
    assigneeIds: explicitAssigneeIds.length
      ? explicitAssigneeIds
      : rawAssignees.map((item) => item?.id || item?.employee_id).filter(Boolean),
    startDate: safeTask.start_date || safeTask.startDate || '',
    dueDate: safeTask.due_date || safeTask.dueDate || '',
    estimatedHours: Number(safeTask.estimated_hours || 0),
    slaHours: Number(prioritySlaById[priorityId] || safeTask.sla_hours || priorityObject?.sla_hours || 0),
    trackedMinutes: Number(safeTask.total_duration_minutes || safeTask.tracked_minutes || 0),
    progressPercentage: Number(safeTask.progress_percentage || 0),
    createdByEmployeeId:
      safeTask.created_by_employee_id ||
      safeTask.created_by_employee?.id ||
      safeTask.created_by_employee?.employee_id ||
      (typeof safeTask.created_by_employee !== 'object' ? safeTask.created_by_employee : null) ||
      safeTask.create_by_employee_id ||
      safeTask.creator_employee_id ||
      safeTask.created_by?.employee_id ||
      null,
    folder: entityName(safeTask.folder, safeTask.folder_name),
    list: entityName(safeTask.list, safeTask.list_name),
    checklist,
    checklistGroups: checklists,
    parentTaskId: safeTask.parent_task_id || safeTask.parentTaskId || null,
    subtasks: rawSubtasks.map((item) => normalizeApiTask(item)),
    activityLogs: Array.isArray(safeTask.activity_logs)
      ? safeTask.activity_logs
      : Array.isArray(safeTask.activities)
        ? safeTask.activities
        : [],
    timeTrackings: Array.isArray(safeTask.time_trackings) ? safeTask.time_trackings : []
  };
};

const AvatarStack = ({ names }) => (
  <div className="avatar-stack">
    {names.map((name) => (
      <span key={name} className="avatar-chip" title={name} style={{ background: avatarColor(name) }}>
        {initials(name)}
      </span>
    ))}
  </div>
);

const StatusBadge = ({ status }) => <Badge style={{ background: `${colorMap[status]}18`, color: colorMap[status] }}>{status}</Badge>;

export default function ToDoList() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('board');
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDataLoading, setCreateDataLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [masters, setMasters] = useState({
    workspaces: [],
    spaces: [],
    folders: [],
    lists: [],
    statuses: [],
    priorities: [],
    types: [],
    employees: []
  });
  const [departments, setDepartments] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState([]);
  const [expandedListIds, setExpandedListIds] = useState([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [selectedListDetail, setSelectedListDetail] = useState(null);
  const [spaceHierarchy, setSpaceHierarchy] = useState({});
  const [showSpaceInput, setShowSpaceInput] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDepartmentId, setNewSpaceDepartmentId] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderDepartment, setFolderDepartment] = useState(null);
  const [folderForm, setFolderForm] = useState({ folderName: '', description: '', colorHex: '#4f46e5' });
  const [savingList, setSavingList] = useState(false);
  const [listForm, setListForm] = useState({ listName: '', description: '', colorHex: '#2563eb', defaultView: 'LIST' });
  const [scope, setScope] = useState({ workspaceId: '', spaceId: '', folderId: '', listId: '' });
  const emptyForm = {
    departmentId: '',
    spaceId: '',
    folderId: '',
    title: '',
    description: '',
    listId: '',
    parentTaskId: '',
    statusId: '',
    priorityId: '',
    typeId: '',
    assigneeIds: [],
    startDate: '',
    dueDate: '',
    estimatedHours: 8
  };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priorityId: '',
    startDate: '',
    dueDate: '',
    progressPercentage: 0,
    assigneeIds: []
  });
  const loggedInUserId = getCookies('id');
  const loggedInEmail = getCookies('email');
  const matchedEmployee = masters.employees.find(
    (item) => String(item.user_id || item.user?.id || '') === String(loggedInUserId) || item.email === loggedInEmail
  );
  const currentEmployeeId =
    getCookies('employee_id') || getCookies('employeeId') || matchedEmployee?.id || matchedEmployee?.employee_id || '';

  const availableTaskLists = useMemo(() => {
    const rows = spaceHierarchy[String(scope.spaceId)]?.lists || masters.lists;
    if (!scope.folderId) return rows;
    return rows.filter((item) => String(item.folder_id || item.folder?.id || '') === String(scope.folderId));
  }, [masters.lists, scope.folderId, scope.spaceId, spaceHierarchy]);
  const selectedFolderLists = useMemo(
    () =>
      scope.folderId
        ? (spaceHierarchy[String(scope.spaceId)]?.lists || masters.lists).filter(
            (item) => String(item.folder_id || item.folder?.id || '') === String(scope.folderId)
          )
        : [],
    [masters.lists, scope.folderId, scope.spaceId, spaceHierarchy]
  );
  const createFolders = useMemo(
    () =>
      (spaceHierarchy[String(form.spaceId)]?.folders || []).filter(
        (item) => String(item.space_id || form.spaceId) === String(form.spaceId)
      ),
    [form.spaceId, spaceHierarchy]
  );
  const createTaskLists = useMemo(
    () =>
      (spaceHierarchy[String(form.spaceId)]?.lists || []).filter(
        (item) => !form.folderId || String(item.folder_id || item.folder?.id || '') === String(form.folderId)
      ),
    [form.folderId, form.spaceId, spaceHierarchy]
  );

  const loadTasks = useCallback(
    async (activeScope = scope) => {
      setLoading(true);
      try {
        const response = await TaskManagementServices.getTask({
          space_id: activeScope.spaceId,
          folder_id: activeScope.folderId,
          list_id: activeScope.listId,
          include_subtasks: true,
          per_page: 100
        });
        if (apiError(response)) throw new Error(response?.data?.message || 'Gagal mengambil daftar tugas');
        setTasks(responseList(response).map(normalizeApiTask));
      } catch (error) {
        setTasks([]);
        showAlert(error?.response?.data?.message || 'Gagal mengambil daftar tugas.', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [scope, showAlert]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setDepartmentLoading(true);
      try {
        const [workspaces, statusesResponse, prioritiesResponse, typesResponse, employeesResponse, departmentsResponse] = await Promise.all(
          [
            TaskManagementServices.getWorkspaces(),
            TaskManagementServices.getStatuses(),
            TaskManagementServices.getPriorities(),
            TaskManagementServices.getTaskTypes(),
            TaskManagementServices.getEmployees(),
            DistributorServices.getOcrByType(3)
          ]
        );
        const assignedDepartments = new Set(getOrganizationAssignment().departments.map((value) => String(value).trim().toLowerCase()));
        const isAdministrator = isAdministratorRole(getCookies('role'));
        const departmentRows = responseList(departmentsResponse)
          .map(normalizeDepartment)
          .filter((department) => department.status !== 0)
          .filter(
            (department) =>
              isAdministrator ||
              assignedDepartments.size === 0 ||
              assignedDepartments.has(department.code.toLowerCase()) ||
              assignedDepartments.has(String(department.id).toLowerCase())
          );
        setDepartments(departmentRows);
        const workspaceRows = responseList(workspaces);
        const workspaceId = workspaceRows[0]?.id || '';
        const spacesResponse = await TaskManagementServices.getSpaces({ workspace_id: workspaceId || 1 });
        const spaceRows = responseList(spacesResponse);
        setSelectedDepartmentIds([]);
        setExpandedDepartmentIds([]);
        setNewSpaceDepartmentId('');
        const nextScope = { workspaceId, spaceId: '', folderId: '', listId: '' };
        setScope(nextScope);
        setMasters({
          workspaces: workspaceRows,
          spaces: spaceRows,
          folders: [],
          lists: [],
          statuses: responseList(statusesResponse),
          priorities: responseList(prioritiesResponse),
          types: responseList(typesResponse),
          employees: responseList(employeesResponse)
        });
        setSpaceHierarchy({});
        await loadTasks(nextScope);
      } catch {
        await loadTasks();
      } finally {
        setDepartmentLoading(false);
      }
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedId) || null;
  const selectedListTasks =
    selectedListDetail && String(scope.listId) === String(selectedListDetail.id) ? tasks.filter((task) => !task.parentTaskId) : [];
  const filteredTasks = tasks;

  const updateLocalTask = (id, changes) => setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...changes } : task)));
  const openTask = async (task) => {
    setSelectedId(task.id);
    try {
      const response = await TaskManagementServices.getTaskDetail(task.id);
      if (apiError(response)) throw new Error(response?.data?.message);
      const detail = normalizeApiTask(responseData(response));
      updateLocalTask(task.id, detail);
      const commentsResponse = await TaskManagementServices.getComments(task.id);
      if (!apiError(commentsResponse)) setComments(responseList(commentsResponse));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengambil detail tugas.', 'danger');
    }
  };
  const openListDetail = async (list) => {
    setSelectedListDetail(list);
    const next = {
      ...scope,
      spaceId: list.space_id || scope.spaceId,
      folderId: list.folder_id || list.folder?.id || scope.folderId,
      listId: list.id
    };
    setScope(next);
    setExpandedListIds((current) => [...new Set([...current, String(list.id)])]);
    await loadTasks(next);
  };
  const changeTaskStatus = async (task, value, { silent = false } = {}) => {
    const master = masters.statuses.find((item) => String(item.id) === String(value) || statusLabel(item) === value);
    const nextStatus = master ? statusLabel(master) : statusById[value] || value;
    updateLocalTask(task.id, { status: nextStatus, statusId: master?.id || value });
    try {
      const response = await TaskManagementServices.changeStatus(task.id, master?.id || value);
      if (apiError(response)) throw new Error(response?.data?.message);
      if (!silent) showAlert('Status tugas berhasil diperbarui.', 'success');
    } catch (error) {
      updateLocalTask(task.id, { status: task.status, statusId: task.statusId });
      if (!silent) showAlert(error?.response?.data?.message || error?.message || 'Gagal memperbarui status.', 'danger');
    }
  };
  const moveTaskToStatus = async (taskId, status) => {
    const task = tasks.find((item) => String(item.id) === String(taskId));
    setDraggingTaskId(null);
    setDragOverStatus('');
    if (!task || task.status === status) return;
    const statusId = Number(Object.keys(statusById).find((id) => statusById[id] === status));
    await changeTaskStatus(task, statusId, { silent: true });
  };
  const createTask = async (event) => {
    event.preventDefault();
    const targetListId = form.listId || scope.listId;
    if (!form.spaceId || !form.folderId || !targetListId) {
      showAlert('Select Department, Folder, and List first.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const response = await TaskManagementServices.createTask({
        space_id: form.spaceId,
        folder_id: form.folderId,
        list_id: targetListId,
        parent_task_id: form.parentTaskId || undefined,
        title: form.title,
        description: form.description,
        status_id: form.statusId || undefined,
        priority_id: form.priorityId || undefined,
        task_type_id: form.typeId || undefined,
        start_date: form.startDate || undefined,
        due_date: form.dueDate || undefined,
        estimated_hours: Number(form.estimatedHours) || undefined,
        assignee_ids: form.assigneeIds
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      setShowCreate(false);
      setForm(emptyForm);
      const nextScope = { ...scope, listId: targetListId };
      setScope(nextScope);
      await loadTasks(nextScope);
      showAlert('Tugas berhasil dibuat.', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat tugas.', 'danger');
    } finally {
      setSaving(false);
    }
  };
  const openCreateTask = () => {
    setForm({
      ...emptyForm,
      departmentId:
        departments.find((department) =>
          masters.spaces.some((space) => String(space.id) === String(scope.spaceId) && spaceMatchesDepartment(space, department))
        )?.id ||
        selectedDepartmentIds[0] ||
        '',
      spaceId: scope.spaceId || '',
      folderId: scope.folderId || '',
      listId: scope.listId || availableTaskLists[0]?.id || '',
      statusId: masters.statuses.find((item) => Number(item.id) === 1 || /to.?do/i.test(statusLabel(item)))?.id || '',
      priorityId: masters.priorities.find((item) => Number(item.id) === 3 || /normal/i.test(priorityLabel(item)))?.id || '',
      typeId: masters.types.find((item) => Number(item.id) === 1 || /^task$/i.test(taskTypeLabel(item)))?.id || ''
    });
    setListForm({ listName: '', description: '', colorHex: '#2563eb', defaultView: 'LIST' });
    setShowCreate(true);
  };
  const changeCreateDepartment = async (departmentId) => {
    const department = departments.find((item) => String(item.id) === String(departmentId));
    const space = department
      ? masters.spaces.find((item) => spaceMatchesDepartment(item, department)) || {
          id: department.code,
          space_name: department.name,
          department_id: department.id,
          department_code: department.code
        }
      : null;
    setForm((current) => ({ ...current, departmentId, spaceId: space?.id || '', folderId: '', listId: '', assigneeIds: [] }));
    if (!department || !space) return;
    setCreateDataLoading(true);
    try {
      const [foldersResponse, listsResponse, employeesResponse] = await Promise.all([
        TaskManagementServices.getFolders({ space_id: space.id }),
        TaskManagementServices.getLists({ space_id: space.id }),
        TaskManagementServices.getEmployees({ department_id: department.id })
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      setSpaceHierarchy((current) => ({ ...current, [String(space.id)]: { folders: folderRows, lists: listRows } }));
      setMasters((current) => ({ ...current, employees: responseList(employeesResponse) }));
    } catch (error) {
      showAlert(error?.response?.data?.message || 'Failed to load department folders.', 'danger');
    } finally {
      setCreateDataLoading(false);
    }
  };
  const taskCreatorEmployeeId = String(selectedTask?.createdByEmployeeId ?? '').trim();
  const loggedInEmployeeId = String(currentEmployeeId ?? '').trim();
  const canEditSelectedTask = Boolean(taskCreatorEmployeeId && loggedInEmployeeId && taskCreatorEmployeeId === loggedInEmployeeId);
  useEffect(() => {
    if (import.meta.env.DEV && selectedTask) {
      console.debug('[Task Edit Access]', {
        taskId: selectedTask.id,
        createdByEmployeeId: taskCreatorEmployeeId || null,
        loggedInEmployeeId: loggedInEmployeeId || null,
        canEdit: canEditSelectedTask
      });
    }
  }, [canEditSelectedTask, loggedInEmployeeId, selectedTask, taskCreatorEmployeeId]);
  const openEditTask = () => {
    if (!selectedTask || !canEditSelectedTask) return;
    setEditForm({
      title: selectedTask.title || '',
      description: selectedTask.description || '',
      priorityId: selectedTask.priorityId || '',
      startDate: toDateTimeLocal(selectedTask.startDate),
      dueDate: toDateTimeLocal(selectedTask.dueDate),
      progressPercentage: Math.min(100, Math.max(0, Number(selectedTask.progressPercentage) || 0)),
      assigneeIds: selectedTask.assigneeIds || []
    });
    setShowEdit(true);
  };
  const editTask = async (event) => {
    event.preventDefault();
    if (!selectedTask || !canEditSelectedTask) return;
    setSavingEdit(true);
    try {
      const response = await TaskManagementServices.putEditTask(selectedTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority_id: editForm.priorityId ? Number(editForm.priorityId) : undefined,
        start_date: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        due_date: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
        progress_percentage: Math.min(100, Math.max(0, Number(editForm.progressPercentage) || 0)),
        assignee_ids: editForm.assigneeIds.map(Number)
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      setShowEdit(false);
      const detailResponse = await TaskManagementServices.getTaskDetail(selectedTask.id);
      if (!apiError(detailResponse)) updateLocalTask(selectedTask.id, normalizeApiTask(responseData(detailResponse)));
      else await loadTasks();
      showAlert('Tugas berhasil diperbarui.', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal memperbarui tugas.', 'danger');
    } finally {
      setSavingEdit(false);
    }
  };
  const createTaskList = async () => {
    const targetSpaceId = showCreate ? form.spaceId : scope.spaceId;
    const targetFolderId = showCreate ? form.folderId : scope.folderId;
    if (!targetSpaceId || !targetFolderId || !listForm.listName.trim()) {
      showAlert('Space, Folder, and List name are required.', 'warning');
      return;
    }
    setSavingList(true);
    try {
      const response = await TaskManagementServices.postListTask({
        space_id: targetSpaceId,
        folder_id: targetFolderId,
        list_name: listForm.listName.trim(),
        description: listForm.description.trim(),
        color_hex: listForm.colorHex,
        default_view: listForm.defaultView
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      const listsResponse = await TaskManagementServices.getLists({
        space_id: targetSpaceId,
        folder_id: targetFolderId
      });
      const listRows = responseList(listsResponse);
      const created = responseData(response);
      const createdList =
        listRows.find((item) => String(item.id) === String(created?.id)) ||
        listRows.find((item) => entityName(item).toLowerCase() === listForm.listName.trim().toLowerCase());
      setMasters((current) => ({ ...current, lists: listRows }));
      setSpaceHierarchy((current) => ({
        ...current,
        [String(targetSpaceId)]: {
          folders: current[String(targetSpaceId)]?.folders || masters.folders,
          lists: listRows
        }
      }));
      if (createdList?.id) setForm((current) => ({ ...current, listId: createdList.id }));
      setListForm({ listName: '', description: '', colorHex: '#2563eb', defaultView: 'LIST' });
      showAlert('List berhasil dibuat dan dipilih sebagai tujuan Task.', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat List.', 'danger');
    } finally {
      setSavingList(false);
    }
  };
  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      const response = await TaskManagementServices.createComment(selectedTask.id, {
        comment_text: comment.trim(),
        is_internal_only: false
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      setComment('');
      const listResponse = await TaskManagementServices.getComments(selectedTask.id);
      setComments(responseList(listResponse));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengirim komentar.', 'danger');
    }
  };
  const deleteTask = () =>
    showConfirm({
      title: 'Hapus tugas?',
      subTitle: `${selectedTask.code} akan dihapus dari daftar.`,
      onConfirm: async () => {
        const response = await TaskManagementServices.deleteTask(selectedTask.id);
        if (apiError(response)) {
          showAlert(response?.data?.message || 'Gagal menghapus tugas.', 'danger');
          return;
        }
        setSelectedId(null);
        await loadTasks();
        showAlert('Tugas berhasil dihapus.', 'success');
      }
    });
  const selectDepartment = async (department) => {
    const space = masters.spaces.find((item) => spaceMatchesDepartment(item, department)) || {
      id: department.code,
      space_name: department.name,
      department_id: department.id,
      department_code: department.code
    };
    setLoading(true);
    try {
      const [foldersResponse, listsResponse, statusesResponse, employeesResponse] = await Promise.all([
        TaskManagementServices.getFolders({ space_id: space.id }),
        TaskManagementServices.getLists({ space_id: space.id }),
        TaskManagementServices.getStatuses({ space_id: space.id }),
        TaskManagementServices.getEmployees({ department_id: department.id })
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      const preferredList = listRows.find((item) => /to.?do/i.test(entityName(item))) || listRows[0];
      const nextScope = { ...scope, spaceId: space.id, folderId: preferredList?.folder_id || '', listId: preferredList?.id || '' };
      setScope(nextScope);
      setMasters((current) => ({
        ...current,
        folders: folderRows,
        lists: listRows,
        statuses: responseList(statusesResponse),
        employees: responseList(employeesResponse)
      }));
      setSpaceHierarchy((current) => ({ ...current, [String(space.id)]: { folders: folderRows, lists: listRows } }));
      await loadTasks(nextScope);
    } catch (error) {
      setLoading(false);
      showAlert(error?.response?.data?.message || `Gagal memuat data department ${department.name}.`, 'danger');
    }
  };
  const changeDepartments = (options) => {
    const ids = (options || []).map((option) => String(option.value));
    setSelectedDepartmentIds(ids);
    setExpandedDepartmentIds((current) => [...new Set([...current.filter((id) => ids.includes(id)), ...ids])]);
    if (!ids.includes(String(newSpaceDepartmentId))) setNewSpaceDepartmentId(ids[0] || '');
    if (!ids.length) {
      setScope((current) => ({ ...current, spaceId: '', folderId: '', listId: '' }));
      setMasters((current) => ({ ...current, folders: [], lists: [] }));
      setTasks([]);
      return;
    }
    const activeSpace = masters.spaces.find((item) => String(item.id) === String(scope.spaceId));
    const activeStillVisible =
      activeSpace &&
      departments.some((department) => ids.includes(String(department.id)) && spaceMatchesDepartment(activeSpace, department));
    if (!activeStillVisible) {
      const firstDepartment = departments.find((department) => String(department.id) === ids[0]);
      if (firstDepartment) selectDepartment(firstDepartment);
    }
  };
  const selectSpace = async (space, departmentId) => {
    const resolvedDepartmentId =
      departmentId || departments.find((item) => spaceMatchesDepartment(space, item))?.id || selectedDepartmentIds[0];
    setLoading(true);
    try {
      const [foldersResponse, listsResponse, statusesResponse, employeesResponse] = await Promise.all([
        TaskManagementServices.getFolders({ space_id: space.id }),
        TaskManagementServices.getLists({ space_id: space.id }),
        TaskManagementServices.getStatuses({ space_id: space.id }),
        TaskManagementServices.getEmployees({ department_id: resolvedDepartmentId })
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      const preferredList = listRows.find((item) => /to.?do/i.test(entityName(item))) || listRows[0];
      const nextScope = { ...scope, spaceId: space.id, folderId: preferredList?.folder_id || '', listId: preferredList?.id || '' };
      setScope(nextScope);
      setMasters((current) => ({
        ...current,
        folders: folderRows,
        lists: listRows,
        statuses: responseList(statusesResponse),
        employees: responseList(employeesResponse)
      }));
      setSpaceHierarchy((current) => ({ ...current, [String(space.id)]: { folders: folderRows, lists: listRows } }));
      await loadTasks(nextScope);
    } catch (error) {
      setLoading(false);
      showAlert(error?.response?.data?.message || 'Gagal memuat Space.', 'danger');
    }
  };
  const openFolderModal = (event, department) => {
    event.stopPropagation();
    setFolderDepartment(department);
    setFolderForm({ folderName: '', description: '', colorHex: '#4f46e5' });
    setShowFolderModal(true);
  };
  const createDepartmentFolder = async (event) => {
    event.preventDefault();
    if (!folderDepartment || !folderForm.folderName.trim()) return;
    setSavingFolder(true);
    try {
      const response = await TaskManagementServices.postCreateFolder({
        space_id: folderDepartment.code,
        folder_name: folderForm.folderName.trim(),
        description: folderForm.description.trim(),
        color_hex: folderForm.colorHex
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      setShowFolderModal(false);
      await selectDepartment(folderDepartment);
      showAlert(`Folder ${folderForm.folderName.trim()} berhasil dibuat.`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat folder.', 'danger');
    } finally {
      setSavingFolder(false);
    }
  };
  const createSpace = async () => {
    const department = departments.find((item) => String(item.id) === String(newSpaceDepartmentId || selectedDepartmentIds[0]));
    if (!newSpaceName.trim() || !department) return;
    try {
      const response = await TaskManagementServices.createSpace({
        workspace_id: scope.workspaceId || 1,
        space_name: newSpaceName.trim(),
        department_id: department.id,
        color_hex: '#4f46e5',
        icon_name: 'ti-layout-kanban',
        is_private: false
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      const spacesResponse = await TaskManagementServices.getSpaces({ workspace_id: scope.workspaceId || 1 });
      const spaceRows = responseList(spacesResponse);
      setMasters((current) => ({ ...current, spaces: spaceRows }));
      setNewSpaceName('');
      setShowSpaceInput(false);
      setExpandedDepartmentIds((current) => [...new Set([...current, String(department.id)])]);
      const createdSpace = responseData(response);
      const target =
        spaceRows.find((item) => String(item.id) === String(createdSpace?.id)) ||
        spaceRows.find((item) => entityName(item).toLowerCase() === newSpaceName.trim().toLowerCase());
      if (target) await selectSpace(target, department.id);
      showAlert('Space berhasil dibuat.', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat Space.', 'danger');
    }
  };

  return (
    <div className="todo-page">
      <div className="workspace-shell">
        <aside className="workspace-nav">
          <div className="text-uppercase text-muted fw-semibold f-10 mb-2">Workspace</div>
          <div className="workspace-picker d-flex align-items-center gap-2 mb-4">
            <span className="metric-icon text-white" style={{ background: '#4f46e5' }}>
              <i className="ti ti-building" />
            </span>
            <div className="min-w-0">
              <div className="fw-semibold f-12 text-truncate">
                {entityName(
                  masters.workspaces.find((item) => String(item.id) === String(scope.workspaceId)),
                  'PT Susanti Megah'
                )}
              </div>
              <div className="text-muted f-10">Corporate Workspace</div>
            </div>
          </div>
          <Form.Group className="mb-4">
            <Form.Label className="text-uppercase text-muted fw-semibold f-10 mb-2">Departments</Form.Label>
            {departmentLoading ? (
              <div className="department-picker-skeleton" />
            ) : (
              <Select
                isMulti
                isClearable
                closeMenuOnSelect={false}
                classNamePrefix="department-select-control"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                placeholder={departments.length ? 'Select departments...' : 'No departments available'}
                isDisabled={!departments.length}
                options={departments.map((department) => ({
                  value: String(department.id),
                  label: `${department.code ? `${department.code} - ` : ''}${department.name}`
                }))}
                value={departments
                  .filter((department) => selectedDepartmentIds.includes(String(department.id)))
                  .map((department) => ({
                    value: String(department.id),
                    label: `${department.code ? `${department.code} - ` : ''}${department.name}`
                  }))}
                onChange={changeDepartments}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
                  control: (base) => ({ ...base, minHeight: 34, fontSize: 12 }),
                  multiValue: (base) => ({ ...base, maxWidth: '100%' })
                }}
              />
            )}
          </Form.Group>
          <div className="text-uppercase text-muted fw-semibold f-10 mb-2">Department & Task</div>
          <div className="workspace-tree">
            {departmentLoading ? (
              <div className="department-loading" role="status" aria-live="polite">
                <span className="visually-hidden">Mengambil master department...</span>
                {[0, 1, 2, 3, 4].map((item) => (
                  <div className="department-skeleton" key={item}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : null}
            {!departmentLoading &&
              departments
                .filter((department) => selectedDepartmentIds.includes(String(department.id)))
                .map((department) => {
                  const departmentId = String(department.id);
                  const isExpanded = expandedDepartmentIds.includes(departmentId);
                  const space = masters.spaces.find((item) => spaceMatchesDepartment(item, department)) || {
                    id: department.code,
                    space_name: department.name,
                    department_id: department.id,
                    department_code: department.code
                  };
                  const hierarchy = spaceHierarchy[String(space?.id)] || { folders: [], lists: [] };
                  return (
                    <div key={department.id} className="department-tree-group">
                      <div className={`tree-row department-row ${isExpanded ? 'active' : ''}`}>
                        <button
                          className="department-select"
                          type="button"
                          onClick={() => {
                            setExpandedDepartmentIds((current) =>
                              current.includes(departmentId) ? current.filter((id) => id !== departmentId) : [...current, departmentId]
                            );
                            if (!isExpanded && space) selectSpace(space, department.id);
                          }}
                        >
                          <i className={`ti ${isExpanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
                          <i className="ti ti-users text-primary" />
                          <span className="text-truncate" title={department.name}>
                            {department.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="department-add"
                          data-permission-action="none"
                          title={`Add folder to ${department.name}`}
                          aria-label={`Add folder to ${department.name}`}
                          onClick={(event) => openFolderModal(event, department)}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      {isExpanded ? (
                        <>
                          {!hierarchy.folders.length ? <div className="text-muted f-10 ps-4 py-2">No folders available.</div> : null}
                          {hierarchy.folders.map((folder) => {
                            const folderId = String(folder.id);
                            const color = folderColor(folder.color_hex);
                            return (
                              <div key={folder.id} className="tree-branch">
                                <button
                                  className={`tree-row ps-lg-4 ${String(scope.folderId) === folderId ? 'active' : ''}`}
                                  type="button"
                                  onClick={() => {
                                    const next = {
                                      ...scope,
                                      spaceId: folder.space_id || space.id,
                                      folderId: folder.id,
                                      listId: ''
                                    };
                                    setScope(next);
                                    loadTasks(next);
                                  }}
                                >
                                  <i className="ti ti-folder" style={{ color }} />
                                  <span className="text-truncate">{entityName(folder)}</span>
                                </button>
                              </div>
                            );
                          })}
                        </>
                      ) : null}
                    </div>
                  );
                })}
          </div>
          {showSpaceInput ? (
            <div className="new-space-box mt-3">
              {selectedDepartmentIds.length > 1 ? (
                <Form.Select
                  size="sm"
                  className="mb-2"
                  value={newSpaceDepartmentId}
                  onChange={(event) => setNewSpaceDepartmentId(event.target.value)}
                  aria-label="Department tujuan Space"
                >
                  {departments
                    .filter((department) => selectedDepartmentIds.includes(String(department.id)))
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </Form.Select>
              ) : null}
              <Form.Control
                size="sm"
                autoFocus
                value={newSpaceName}
                onChange={(event) => setNewSpaceName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createSpace();
                  if (event.key === 'Escape') setShowSpaceInput(false);
                }}
                placeholder="New Space name"
              />
              <div className="d-flex gap-1 mt-2">
                <Button
                  size="sm"
                  className="flex-grow-1"
                  data-permission-action="none"
                  disabled={!newSpaceName.trim()}
                  onClick={createSpace}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="light-secondary"
                  onClick={() => {
                    setShowSpaceInput(false);
                    setNewSpaceName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </aside>

        <main className="workspace-content">
          <Stack direction="horizontal" className="justify-content-between align-items-start gap-3 mb-4">
            <div className="todo-title-row">
              <div>
                <div className="text-muted f-12 mb-1">
                  {departments
                    .filter((item) => selectedDepartmentIds.includes(String(item.id)))
                    .map((item) => item.name)
                    .join(', ') || 'Department'}{' '}
                  /{' '}
                  {entityName(
                    masters.folders.find((item) => String(item.id) === String(scope.folderId)),
                    'All Tasks'
                  )}
                </div>
                <h4 className="mb-1">
                  {entityName(
                    masters.lists.find((item) => String(item.id) === String(scope.listId)),
                    'To Do List'
                  )}
                </h4>
                <div className="text-muted f-12">Manage departmental work in one place.</div>
              </div>
            </div>
            <Stack direction="horizontal" gap={2}>
              <Button variant="outline-secondary" onClick={() => loadTasks()} disabled={loading}>
                <i className={`ti ti-refresh me-1 ${loading ? 'spin' : ''}`} />
                Refresh
              </Button>
              <Button data-permission-action="none" onClick={openCreateTask} disabled={loading}>
                <i className="ti ti-plus me-1" />
                New Task
              </Button>
            </Stack>
          </Stack>

          {scope.folderId ? (
            <section className="folder-lists-panel mb-3">
              <div className="folder-lists-heading">
                <div>
                  <div className="text-muted f-10 text-uppercase fw-semibold">Task Lists</div>
                  <div className="fw-semibold">
                    {entityName(
                      masters.folders.find((item) => String(item.id) === String(scope.folderId)),
                      'Folder'
                    )}
                  </div>
                </div>
                <Badge bg="light-primary" text="primary">
                  {selectedFolderLists.length} List
                </Badge>
              </div>
              {!selectedFolderLists.length ? <div className="text-muted f-12 p-3">No Lists in this Folder.</div> : null}
              {selectedFolderLists.map((list) => {
                const listId = String(list.id);
                const listExpanded = expandedListIds.includes(listId);
                const listTasks = String(scope.listId) === listId ? tasks.filter((task) => !task.parentTaskId) : [];
                const listSubtasks = listTasks.flatMap((task) => {
                  const nestedSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                  return nestedSubtasks.length ? nestedSubtasks : tasks.filter((item) => String(item.parentTaskId) === String(task.id));
                });
                const completedSubtasks = listSubtasks.filter(isCompletedTask).length;
                const listProgress = listSubtasks.length ? Math.round((completedSubtasks / listSubtasks.length) * 100) : 0;
                return (
                  <div className="content-list-branch" key={list.id}>
                    <div className={`content-list-row ${String(scope.listId) === listId ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="content-list-toggle"
                        aria-label={`${listExpanded ? 'Tutup' : 'Buka'} task ${entityName(list)}`}
                        onClick={() => {
                          const willExpand = !listExpanded;
                          setExpandedListIds((current) =>
                            willExpand ? [...new Set([...current, listId])] : current.filter((id) => id !== listId)
                          );
                          if (willExpand) {
                            const next = { ...scope, listId: list.id };
                            setScope(next);
                            loadTasks(next);
                          }
                        }}
                      >
                        <i className={`ti ${listExpanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
                      </button>
                      <button type="button" className="content-list-name" onClick={() => openListDetail(list)}>
                        <i className="ti ti-list-check" />
                        <span>{entityName(list)}</span>
                      </button>
                      <div className="content-list-progress" title={`${completedSubtasks} of ${listSubtasks.length} subtasks completed`}>
                        <span>
                          {completedSubtasks}/{listSubtasks.length} completed
                        </span>
                        <ProgressBar className="progress-thin" now={listProgress} variant="success" />
                        <strong>{listProgress}%</strong>
                      </div>
                    </div>
                    {listExpanded ? (
                      <div className="content-task-tree">
                        {loading && String(scope.listId) === listId ? (
                          <div className="text-muted f-11 py-2 ps-4">
                            <span className="spinner-border spinner-border-sm me-2" />
                            Loading tasks...
                          </div>
                        ) : null}
                        {!loading && String(scope.listId) === listId && !listTasks.length ? (
                          <div className="text-muted f-11 py-2 ps-4">No Tasks in this List.</div>
                        ) : null}
                        {!loading &&
                          String(scope.listId) === listId &&
                          listTasks.map((task) => {
                            const taskId = String(task.id);
                            const taskExpanded = expandedTaskIds.includes(taskId);
                            const subtasks = task.subtasks?.length
                              ? task.subtasks
                              : tasks.filter((item) => String(item.parentTaskId) === taskId);
                            return (
                              <div className="content-task-branch" key={task.id}>
                                <div className="content-task-row">
                                  <button
                                    type="button"
                                    className="content-task-toggle"
                                    onClick={() =>
                                      setExpandedTaskIds((current) =>
                                        current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]
                                      )
                                    }
                                  >
                                    <i className={`ti ${taskExpanded ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
                                  </button>
                                  <button type="button" className="content-task-name" onClick={() => openTask(task)}>
                                    {task.title}
                                  </button>
                                </div>
                                {taskExpanded ? (
                                  <div className="content-task-detail-table">
                                    <div className="content-task-detail-grid content-subtask-header" aria-hidden="true">
                                      <span>Priority</span>
                                      <span>Status</span>
                                      <span>Assignee</span>
                                      <span>Due Date</span>
                                      <span>Progress</span>
                                      <span>Duration</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="content-task-detail-grid content-subtask-detail"
                                      onClick={() => openTask(task)}
                                    >
                                      <span>
                                        <Badge bg="light-primary" text="primary">
                                          {task.priority}
                                        </Badge>
                                        {task.slaHours ? <small>SLA {task.slaHours} Jam</small> : null}
                                      </span>
                                      <span>
                                        <StatusBadge status={task.status} />
                                      </span>
                                      <span>{task.assignees.length ? <AvatarStack names={task.assignees} /> : '-'}</span>
                                      <span className={isOverdue(task) ? 'overdue' : ''}>{formatDate(task.dueDate)}</span>
                                      <span className="content-subtask-progress">
                                        <small>
                                          {checklistProgress(task).done}/{checklistProgress(task).total}
                                          <strong>{task.progressPercentage || checklistProgress(task).percent}%</strong>
                                        </small>
                                        <ProgressBar
                                          className="progress-thin"
                                          now={task.progressPercentage || checklistProgress(task).percent}
                                          variant="success"
                                        />
                                      </span>
                                      <span>{formatDuration(task.trackedMinutes)}</span>
                                    </button>
                                  </div>
                                ) : null}
                                {taskExpanded && subtasks.length ? (
                                  <div className="content-subtask-table">
                                    <div className="content-subtask-grid content-subtask-header" aria-hidden="true">
                                      <span>Task</span>
                                      <span>Priority</span>
                                      <span>Status</span>
                                      <span>Assignee</span>
                                      <span>Due Date</span>
                                      <span>Progress</span>
                                      <span>Duration</span>
                                    </div>
                                    {subtasks.map((subtask) => {
                                      const checklist = checklistProgress(subtask);
                                      const progress = subtask.progressPercentage || checklist.percent;
                                      return (
                                        <button
                                          key={subtask.id}
                                          type="button"
                                          className="content-subtask-grid content-subtask-detail"
                                          onClick={() => openTask(subtask)}
                                        >
                                          <span className="content-subtask-title">
                                            <i className="ti ti-corner-down-right" />
                                            <span>
                                              <small>{subtask.code}</small>
                                              <strong>{subtask.title}</strong>
                                            </span>
                                          </span>
                                          <span>
                                            <Badge bg="light-primary" text="primary">
                                              {subtask.priority}
                                            </Badge>
                                            {subtask.slaHours ? <small>SLA {subtask.slaHours} Jam</small> : null}
                                          </span>
                                          <span>
                                            <StatusBadge status={subtask.status} />
                                          </span>
                                          <span>{subtask.assignees.length ? <AvatarStack names={subtask.assignees} /> : '-'}</span>
                                          <span className={isOverdue(subtask) ? 'overdue' : ''}>{formatDate(subtask.dueDate)}</span>
                                          <span className="content-subtask-progress">
                                            <small>
                                              {checklist.done}/{checklist.total}
                                              <strong>{progress}%</strong>
                                            </small>
                                            <ProgressBar className="progress-thin" now={progress} variant="success" />
                                          </span>
                                          <span>{formatDuration(subtask.trackedMinutes)}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}

          <div className="d-flex justify-content-end mb-3">
            <div className="btn-group">
              <Button size="sm" variant={view === 'list' ? 'primary' : 'outline-secondary'} onClick={() => setView('list')} title="List">
                <i className="ti ti-list" />
              </Button>
              <Button size="sm" variant={view === 'board' ? 'primary' : 'outline-secondary'} onClick={() => setView('board')} title="Board">
                <i className="ti ti-layout-kanban" />
              </Button>
            </div>
          </div>

          <div className="task-panel p-0 overflow-hidden">
            {view === 'list' ? (
              <Table responsive hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Progress</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <span className="spinner-border spinner-border-sm me-2" />
                        Loading tasks...
                      </td>
                    </tr>
                  ) : null}
                  {!loading &&
                    filteredTasks.map((task) => {
                      const progress = checklistProgress(task);
                      return (
                        <tr key={task.id} role="button" onClick={() => openTask(task)}>
                          <td style={{ minWidth: 250 }}>
                            <div className="task-code">{task.code}</div>
                            <div className="fw-semibold f-13 mt-1">{task.title}</div>
                            <div className="text-muted f-10">
                              {task.folder} / {task.list}
                            </div>
                          </td>
                          <td>
                            <Badge bg={priorityVariant[task.priority]}>{task.priority}</Badge>
                            <div className="text-muted f-10 mt-1">SLA {slaMap[task.priority]}</div>
                          </td>
                          <td>
                            <StatusBadge status={task.status} />
                          </td>
                          <td>
                            <AvatarStack names={task.assignees} />
                          </td>
                          <td>
                            <span className={isOverdue(task) ? 'overdue' : ''}>
                              {isOverdue(task) && <i className="ti ti-alert-circle me-1" />}
                              {formatDate(task.dueDate)}
                            </span>
                          </td>
                          <td style={{ minWidth: 110 }}>
                            <div className="d-flex justify-content-between f-10 mb-1">
                              <span>
                                {progress.done}/{progress.total}
                              </span>
                              <span>{progress.percent}%</span>
                            </div>
                            <ProgressBar className="progress-thin" now={progress.percent} variant="success" />
                          </td>
                          <td className="text-nowrap">{formatDuration(task.trackedMinutes)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </Table>
            ) : (
              <div className="kanban-scroll p-3">
                <div className="kanban-board">
                  {statuses.map((status) => (
                    <section
                      className={`kanban-column ${dragOverStatus === status ? 'drag-over' : ''}`}
                      key={status}
                      style={{ backgroundColor: `${colorMap[status]}12`, borderColor: `${colorMap[status]}66` }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDragOverStatus(status);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus('');
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        moveTaskToStatus(event.dataTransfer.getData('text/task-id') || draggingTaskId, status);
                      }}
                    >
                      <div className="kanban-column-header d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold">
                          <i className="ti ti-circle-filled me-1" style={{ color: colorMap[status] }} />
                          {status}
                        </span>
                        <Badge bg="light-secondary" text="dark">
                          {filteredTasks.filter((task) => task.status === status).length}
                        </Badge>
                      </div>
                      <Stack gap={2} className="kanban-card-scroll">
                        {filteredTasks
                          .filter((task) => task.status === status)
                          .map((task) => {
                            const progress = checklistProgress(task);
                            return (
                              <Card
                                className={`kanban-card ${String(draggingTaskId) === String(task.id) ? 'dragging' : ''}`}
                                key={task.id}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData('text/task-id', String(task.id));
                                  setDraggingTaskId(task.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingTaskId(null);
                                  setDragOverStatus('');
                                }}
                                onClick={() => openTask(task)}
                                style={{ backgroundColor: `${colorMap[status]}0d`, borderColor: `${colorMap[status]}80` }}
                              >
                                <Card.Body>
                                  <div className="task-code kanban-list-title mb-1">
                                    {task.list && task.list !== '-'
                                      ? task.list
                                      : entityName(
                                          masters.lists.find((item) => String(item.id) === String(task.list_id)),
                                          'Task List'
                                        )}
                                  </div>
                                  <div className="kanban-task-title fw-semibold mb-2">{task.title}</div>
                                  <div className="kanban-card-meta d-flex justify-content-between mb-2">
                                    <Badge bg={priorityVariant[task.priority]}>{task.priority}</Badge>
                                    <AvatarStack names={task.assignees} />
                                  </div>
                                  <ProgressBar
                                    className="progress-thin mb-2"
                                    now={progress.percent}
                                    style={{ '--bs-progress-bar-bg': colorMap[status] }}
                                  />
                                  <div className="d-flex justify-content-between text-muted f-10">
                                    <span>
                                      <i className="ti ti-checklist me-1" />
                                      {progress.done}/{progress.total}
                                    </span>
                                    <span className={isOverdue(task) ? 'overdue' : ''}>
                                      <i className="ti ti-calendar me-1" />
                                      {formatDate(task.dueDate)}
                                    </span>
                                  </div>
                                </Card.Body>
                              </Card>
                            );
                          })}
                      </Stack>
                    </section>
                  ))}
                </div>
              </div>
            )}
            {!loading && !filteredTasks.length && (
              <div className="text-center py-5">
                <i className="ti ti-clipboard-off text-muted f-32" />
                <h6 className="mt-3">No tasks found</h6>
                <p className="text-muted f-12">Create the first task for this selection.</p>
                <Button size="sm" data-permission-action="none" onClick={openCreateTask} disabled={loading}>
                  + Create First Task
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <Offcanvas show={Boolean(selectedTask)} onHide={() => setSelectedId(null)} placement="end" className="todo-detail-drawer">
        {selectedTask && (
          <>
            <Offcanvas.Header closeButton>
              <div className="flex-grow-1">
                <div className="task-code mb-1">{selectedTask.code}</div>
                <Offcanvas.Title>{selectedTask.title}</Offcanvas.Title>
              </div>
              {canEditSelectedTask ? (
                <Button variant="outline-primary" size="sm" className="me-2" onClick={openEditTask}>
                  <i className="ti ti-edit me-1" />
                  Edit
                </Button>
              ) : null}
              <Button variant="outline-danger" size="sm" className="me-3" onClick={deleteTask}>
                <i className="ti ti-trash" />
              </Button>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Row className="g-3 mb-4">
                <Col sm={6}>
                  <Form.Label className="text-muted f-11">Status</Form.Label>
                  <Form.Select
                    size="sm"
                    value={selectedTask.statusId || selectedTask.status}
                    onChange={(event) => changeTaskStatus(selectedTask, event.target.value)}
                  >
                    {(masters.statuses.length ? masters.statuses : statuses).map((item) => (
                      <option key={item.id || item} value={item.id || item}>
                        {typeof item === 'object' ? statusLabel(item) : item}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col sm={6}>
                  <Form.Label className="text-muted f-11">Priority & SLA</Form.Label>
                  <div>
                    <Badge bg={priorityVariant[selectedTask.priority]}>
                      {selectedTask.priority} · SLA {slaMap[selectedTask.priority]}
                    </Badge>
                  </div>
                </Col>
                <Col sm={6}>
                  <Form.Label className="text-muted f-11">Assignees</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <AvatarStack names={selectedTask.assignees} />
                    <span className="f-12">{selectedTask.assignees.join(', ')}</span>
                  </div>
                </Col>
                <Col sm={3}>
                  <Form.Label className="text-muted f-11">Start Date</Form.Label>
                  <div className="f-12 fw-semibold">{formatDate(selectedTask.startDate)}</div>
                </Col>
                <Col sm={3}>
                  <Form.Label className="text-muted f-11">Deadline</Form.Label>
                  <div className={`f-12 ${isOverdue(selectedTask) ? 'overdue' : 'fw-semibold'}`}>{formatDate(selectedTask.dueDate)}</div>
                </Col>
              </Row>
              <div className="mb-4">
                <h6>Description</h6>
                <p className="text-muted f-12 lh-lg">{selectedTask.description}</p>
              </div>
              <Tabs defaultActiveKey="comments" className="mb-3">
                <Tab eventKey="comments" title="Comments">
                  {comments.map((item) => (
                    <div key={item.id} className="border-bottom py-2">
                      <strong className="f-12">{entityName(item.user, item.employee_name || 'User')}</strong>
                      <div className="f-12">{item.comment_text || item.text}</div>
                    </div>
                  ))}
                  <div className="d-flex gap-2 mt-3">
                    <Form.Control
                      size="sm"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Tulis komentar..."
                    />
                    <Button size="sm" disabled={!comment.trim()} onClick={sendComment}>
                      Send
                    </Button>
                  </div>
                </Tab>
                <Tab eventKey="activity" title="Activity">
                  {selectedTask.activityLogs?.map((item) => (
                    <div className="border-start ps-3 ms-1 mb-3" key={item.id}>
                      <p className="f-12 mb-1">
                        <strong>{entityName(item.user, item.employee_name || 'System')}</strong> {item.description || item.action}
                      </p>
                      <p className="text-muted f-10 mb-0">
                        {item.created_at ? formatDate(item.created_at.slice(0, 10)) : 'Aktivitas terbaru'}
                      </p>
                    </div>
                  ))}
                  {!selectedTask.activityLogs?.length ? <p className="text-muted f-12">Belum ada aktivitas.</p> : null}
                </Tab>
              </Tabs>
            </Offcanvas.Body>
          </>
        )}
      </Offcanvas>

      <Offcanvas
        show={Boolean(selectedListDetail)}
        onHide={() => setSelectedListDetail(null)}
        placement="end"
        className="todo-detail-drawer list-detail-drawer"
      >
        {selectedListDetail ? (
          <>
            <Offcanvas.Header closeButton>
              <div>
                <div className="task-code mb-1">
                  {displayText(selectedListDetail.list_code || selectedListDetail.code, `LIST-${selectedListDetail.id}`)}
                </div>
                <Offcanvas.Title>{entityName(selectedListDetail)}</Offcanvas.Title>
              </div>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Row className="g-3 mb-4">
                <Col sm={6}>
                  <Form.Label className="text-muted f-11">Folder</Form.Label>
                  <div className="f-12 fw-semibold">
                    {entityName(
                      masters.folders.find((item) => String(item.id) === String(scope.folderId)),
                      selectedListDetail.folder_name || '-'
                    )}
                  </div>
                </Col>
                <Col sm={3}>
                  <Form.Label className="text-muted f-11">Default View</Form.Label>
                  <div className="f-12 fw-semibold">{displayText(selectedListDetail.default_view, 'LIST')}</div>
                </Col>
                <Col sm={3}>
                  <Form.Label className="text-muted f-11">Color</Form.Label>
                  <div className="d-flex align-items-center gap-2 f-12">
                    <span className="list-color-preview" style={{ backgroundColor: selectedListDetail.color_hex || '#2563eb' }} />
                    {displayText(selectedListDetail.color_hex, '#2563eb')}
                  </div>
                </Col>
              </Row>
              <div className="mb-4">
                <h6>Description</h6>
                <p className="text-muted f-12 lh-lg mb-0">{displayText(selectedListDetail.description, 'No description.')}</p>
              </div>
              <div className="list-detail-tasks">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0">List Task</h6>
                  <span className="text-muted f-11">{selectedListTasks.length} Task</span>
                </div>
                {loading ? (
                  <div className="text-center text-muted py-4">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading tasks...
                  </div>
                ) : null}
                {!loading && !selectedListTasks.length ? (
                  <div className="list-detail-empty text-center text-muted py-4">
                    <i className="ti ti-clipboard-off f-24" />
                    <div className="mt-2 f-12">No Tasks in this List.</div>
                  </div>
                ) : null}
                {!loading &&
                  selectedListTasks.map((task) => {
                    const subtaskCount =
                      task.subtasks?.length || tasks.filter((item) => String(item.parentTaskId) === String(task.id)).length;
                    return (
                      <button
                        type="button"
                        className="list-detail-task-row"
                        key={task.id}
                        onClick={() => {
                          setSelectedListDetail(null);
                          openTask(task);
                        }}
                      >
                        <span className="list-detail-task-status" style={{ backgroundColor: colorMap[task.status] || '#64748b' }} />
                        <span className="flex-grow-1 min-w-0 text-start">
                          <span className="task-code d-block">{task.code}</span>
                          <span className="d-block text-truncate fw-semibold">{task.title}</span>
                        </span>
                        <span className="text-muted f-10 text-nowrap">{subtaskCount ? `${subtaskCount} Subtask` : task.status}</span>
                        <i className="ti ti-chevron-right" />
                      </button>
                    );
                  })}
              </div>
            </Offcanvas.Body>
          </>
        ) : null}
      </Offcanvas>

      <Modal className="todo-task-modal" show={showEdit} onHide={() => !savingEdit && setShowEdit(false)} centered>
        <Form onSubmit={editTask}>
          <Modal.Header closeButton={!savingEdit}>
            <Modal.Title>Edit Task</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Title *</Form.Label>
                <Form.Control
                  required
                  value={editForm.title}
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                />
              </Col>
              <Col sm={4}>
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={editForm.priorityId}
                  onChange={(event) => setEditForm((current) => ({ ...current, priorityId: event.target.value }))}
                >
                  <option value="">Select Priority</option>
                  {masters.priorities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {priorityLabel(item)}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm={4}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={editForm.startDate}
                  onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </Col>
              <Col sm={4}>
                <Form.Label>Deadline</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Progress ({editForm.progressPercentage}%)</Form.Label>
                <Form.Range
                  min={0}
                  max={100}
                  value={editForm.progressPercentage}
                  onChange={(event) => setEditForm((current) => ({ ...current, progressPercentage: Number(event.target.value) }))}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Assignee</Form.Label>
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  classNamePrefix="task-assignee-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={masters.employees.map((item) => ({
                    value: item.id,
                    label: entityName(item, item.employee_name)
                  }))}
                  value={masters.employees
                    .filter((item) => editForm.assigneeIds.some((id) => String(id) === String(item.id)))
                    .map((item) => ({ value: item.id, label: entityName(item, item.employee_name) }))}
                  onChange={(options) =>
                    setEditForm((current) => ({ ...current, assigneeIds: (options || []).map((option) => option.value) }))
                  }
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                  placeholder="Select assignees..."
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light-secondary" disabled={savingEdit} onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit || !editForm.title.trim()}>
              {savingEdit ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal className="todo-task-modal" show={showFolderModal} onHide={() => !savingFolder && setShowFolderModal(false)} centered>
        <Form onSubmit={createDepartmentFolder}>
          <Modal.Header closeButton={!savingFolder}>
            <Modal.Title>Add Work Folder</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted f-12 mb-3">
              The new Folder will be added to <strong>{folderDepartment?.name || '-'}</strong>.
            </p>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Space ID</Form.Label>
                <Form.Control value={folderDepartment?.code || ''} readOnly disabled />
                <Form.Text className="text-muted">Automatically taken from department_code.</Form.Text>
              </Col>
              <Col xs={12}>
                <Form.Label>Folder Name *</Form.Label>
                <Form.Control
                  autoFocus
                  required
                  maxLength={150}
                  value={folderForm.folderName}
                  onChange={(event) => setFolderForm((current) => ({ ...current, folderName: event.target.value }))}
                  placeholder="Example: Recruitment 2026"
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  maxLength={500}
                  value={folderForm.description}
                  onChange={(event) => setFolderForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the purpose of this work folder"
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Folder Color</Form.Label>
                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="color"
                    value={folderForm.colorHex}
                    onChange={(event) => setFolderForm((current) => ({ ...current, colorHex: event.target.value }))}
                    title="Select folder color"
                    style={{ width: 52, height: 38, padding: 4 }}
                  />
                  <Form.Control
                    value={folderForm.colorHex}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    onChange={(event) => setFolderForm((current) => ({ ...current, colorHex: event.target.value }))}
                    placeholder="#4f46e5"
                  />
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light-secondary"
              data-permission-action="none"
              disabled={savingFolder}
              onClick={() => setShowFolderModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-permission-action="none"
              disabled={savingFolder || !folderForm.folderName.trim() || !/^#[0-9a-f]{6}$/i.test(folderForm.colorHex)}
            >
              {savingFolder ? (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              ) : (
                <i className="ti ti-folder-plus me-1" />
              )}
              {savingFolder ? 'Saving...' : 'Add Folder'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal className="todo-task-modal" show={showCreate} onHide={() => setShowCreate(false)} size="xl" centered>
        <Form onSubmit={createTask}>
          <Modal.Header closeButton>
            <Modal.Title>New Task</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Department *</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  isLoading={departmentLoading}
                  isDisabled={departmentLoading}
                  placeholder="Select Department"
                  options={departments.map((item) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ''}${item.name}` }))}
                  value={
                    departments
                      .filter((item) => String(item.id) === String(form.departmentId))
                      .map((item) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ''}${item.name}` }))[0] || null
                  }
                  onChange={(option) => changeCreateDepartment(option?.value || '')}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Folder *</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  isLoading={createDataLoading}
                  isDisabled={!form.departmentId || !form.spaceId || createDataLoading}
                  placeholder={createDataLoading ? 'Loading Folders...' : 'Select Folder'}
                  options={createFolders.map((item) => ({ value: item.id, label: entityName(item) }))}
                  value={
                    createFolders
                      .filter((item) => String(item.id) === String(form.folderId))
                      .map((item) => ({ value: item.id, label: entityName(item) }))[0] || null
                  }
                  onChange={(option) => setForm((current) => ({ ...current, folderId: option?.value || '', listId: '' }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Target List *</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  isLoading={createDataLoading}
                  isDisabled={!form.folderId || createDataLoading}
                  placeholder={createDataLoading ? 'Loading Lists...' : 'Select List'}
                  options={createTaskLists.map((item) => ({ value: item.id, label: entityName(item) }))}
                  value={
                    createTaskLists
                      .filter((item) => String(item.id) === String(form.listId))
                      .map((item) => ({ value: item.id, label: entityName(item) }))[0] || null
                  }
                  onChange={(option) => setForm((current) => ({ ...current, listId: option?.value || '' }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
                {form.folderId && !createTaskLists.length ? (
                  <div className="border rounded p-3 mt-2 bg-light">
                    <div className="d-flex align-items-start gap-2 mb-3">
                      <i className="ti ti-alert-triangle text-warning mt-1" />
                      <div className="f-11">
                        <strong className="d-block">This Folder has no List</strong>
                        Create a target List without closing the New Task modal.
                      </div>
                    </div>
                    <Row className="g-2">
                      <Col xs={12}>
                        <Form.Control
                          size="sm"
                          value={listForm.listName}
                          onChange={(event) => setListForm((current) => ({ ...current, listName: event.target.value }))}
                          placeholder="List Name *"
                        />
                      </Col>
                      <Col xs={12}>
                        <Form.Control
                          size="sm"
                          value={listForm.description}
                          onChange={(event) => setListForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="List Description"
                        />
                      </Col>
                      <Col xs={6}>
                        <Select
                          classNamePrefix="task-form-select"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          options={['LIST', 'BOARD', 'CALENDAR', 'GANTT'].map((item) => ({ value: item, label: item }))}
                          value={{ value: listForm.defaultView, label: listForm.defaultView }}
                          onChange={(option) => setListForm((current) => ({ ...current, defaultView: option?.value || 'LIST' }))}
                          styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                        />
                      </Col>
                      <Col xs={6}>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="color"
                            size="sm"
                            value={listForm.colorHex}
                            onChange={(event) => setListForm((current) => ({ ...current, colorHex: event.target.value }))}
                            title="List Color"
                            style={{ width: 42 }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="flex-grow-1 text-nowrap"
                            data-permission-action="none"
                            disabled={savingList || !form.spaceId || !form.folderId || !listForm.listName.trim()}
                            onClick={createTaskList}
                          >
                            {savingList ? (
                              <span className="spinner-border spinner-border-sm me-1" />
                            ) : (
                              <i className="ti ti-list-plus me-1" />
                            )}
                            Create List
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </div>
                ) : null}
              </Col>
              <Col xs={12}>
                <Form.Label>Task Title *</Form.Label>
                <Form.Control
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Example: Prepare interview schedule"
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Status</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  placeholder="Default Status"
                  options={masters.statuses
                    .filter((item) => statusById[item.id])
                    .map((item) => ({ value: item.id, label: statusLabel(item) }))}
                  value={
                    masters.statuses
                      .filter((item) => String(item.id) === String(form.statusId))
                      .map((item) => ({ value: item.id, label: statusLabel(item) }))[0] || null
                  }
                  onChange={(option) => setForm((current) => ({ ...current, statusId: option?.value || '' }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Priority</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  placeholder="Select Priority"
                  options={masters.priorities
                    .filter((item) => priorityById[item.id])
                    .map((item) => ({ value: item.id, label: priorityLabel(item) }))}
                  value={
                    masters.priorities
                      .filter((item) => String(item.id) === String(form.priorityId))
                      .map((item) => ({ value: item.id, label: priorityLabel(item) }))[0] || null
                  }
                  onChange={(option) => setForm((current) => ({ ...current, priorityId: option?.value || '' }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Task Type</Form.Label>
                <Select
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isClearable
                  placeholder="Select Type"
                  options={masters.types
                    .filter((item) => taskTypeById[item.id])
                    .map((item) => ({ value: item.id, label: taskTypeLabel(item) }))}
                  value={
                    masters.types
                      .filter((item) => String(item.id) === String(form.typeId) && taskTypeById[item.id])
                      .map((item) => ({ value: item.id, label: taskTypeLabel(item) }))[0] || null
                  }
                  onChange={(option) => setForm((current) => ({ ...current, typeId: option?.value || '' }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Assignee</Form.Label>
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isLoading={createDataLoading}
                  isDisabled={createDataLoading || !form.departmentId}
                  placeholder={createDataLoading ? 'Loading Employees...' : 'Select Employees'}
                  options={masters.employees.map((item) => ({
                    value: item.id,
                    label: `${entityName(item, item.employee_name)}${item.nik ? ` · ${item.nik}` : ''}`
                  }))}
                  value={masters.employees
                    .filter((item) => form.assigneeIds.some((id) => String(id) === String(item.id)))
                    .map((item) => ({
                      value: item.id,
                      label: `${entityName(item, item.employee_name)}${item.nik ? ` · ${item.nik}` : ''}`
                    }))}
                  onChange={(options) => setForm((current) => ({ ...current, assigneeIds: (options || []).map((option) => option.value) }))}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Deadline *</Form.Label>
                <Form.Control type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </Col>
              <Col sm={6}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Estimated Hours</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={form.estimatedHours}
                  onChange={(event) => setForm({ ...form, estimatedHours: event.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" data-permission-action="none" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-permission-action="none"
              disabled={saving || createDataLoading || !form.departmentId || !form.folderId || !form.listId || !form.title.trim()}
            >
              {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-plus me-1" />}
              {saving ? 'Creating...' : 'Create Task'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
