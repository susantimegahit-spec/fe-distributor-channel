import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Overlay from 'react-bootstrap/Overlay';
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
const toDateInput = (date) => toDateTimeLocal(date).slice(0, 10);
const responseData = (response) => response?.data?.data ?? response?.data ?? null;
const responseList = (response) => {
  const data = responseData(response);
  if (Array.isArray(data)) return data;
  const rows = data?.data || data?.items || data?.rows || data?.results || data?.employees || data?.comments;
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
const normalizeEmployee = (item, index) => ({
  ...item,
  id: item?.id ?? item?.employee_id ?? item?.employeeId ?? item?.user_id ?? `employee-${index}`,
  name:
    item?.name ??
    item?.employee_name ??
    item?.employeeName ??
    item?.full_name ??
    item?.fullName ??
    item?.user?.name ??
    `Employee ${index + 1}`,
  nik: item?.nik ?? item?.employee_code ?? item?.employeeCode ?? item?.code ?? '',
  email: item?.email ?? item?.employee_email ?? item?.employeeEmail ?? item?.user?.email ?? ''
});
const employeeList = (response) => responseList(response).map(normalizeEmployee);
const buildCommentThreads = (items) => {
  const nodes = new Map();
  const collect = (list, parentId = null) => {
    if (!Array.isArray(list)) return;
    list.forEach((item, index) => {
      const id = item.id ?? item.comment_id ?? `comment-${nodes.size}-${index}`;
      const key = String(id);
      const previous = nodes.get(key);
      const explicitParentId = item.parent_comment_id ?? item.parentCommentId ?? item.parent_comment?.id;
      nodes.set(key, {
        item: { ...previous?.item, ...item, id },
        parentId: explicitParentId ?? parentId ?? previous?.parentId ?? null,
        replies: []
      });
      collect(item.replies ?? item.children ?? item.child_comments, id);
    });
  };
  collect(items);
  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parentId == null ? null : nodes.get(String(node.parentId));
    if (parent && parent !== node) parent.replies.push(node);
    else roots.push(node);
  });
  return roots;
};
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
    department: entityName(
      safeTask.department || safeTask.space?.department,
      safeTask.department_name || safeTask.department_code || safeTask.space?.department_name || safeTask.space?.name
    ),
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

const statusBadgeClass = {
  'To Do': 'to-do',
  'In Progress': 'in-progress',
  'In Review': 'in-review',
  Done: 'done',
  Cancelled: 'cancelled'
};
const StatusBadge = ({ status }) => (
  <span className={`todo-status-badge todo-status-badge--${statusBadgeClass[status] || 'default'}`}>{status}</span>
);
const priorityBadgeClass = { Urgent: 'urgent', High: 'high', Normal: 'normal', Low: 'low' };
const PriorityBadge = ({ priority }) => (
  <span className={`todo-priority-badge todo-priority-badge--${priorityBadgeClass[priority] || 'default'}`}>{priority}</span>
);
const getInlineTaskTitles = (taskText = '') =>
  taskText
    .split(/\r?\n/)
    .map((title) => title.trim())
    .filter(Boolean);

export default function ToDoList() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('list');
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [deletingSelectedTasks, setDeletingSelectedTasks] = useState(false);
  const [moveTargetListId, setMoveTargetListId] = useState('');
  const [movingSelectedTasks, setMovingSelectedTasks] = useState(false);
  const [copyingSelectedTasks, setCopyingSelectedTasks] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [savingBulkUpdate, setSavingBulkUpdate] = useState(false);
  const [bulkUpdateForm, setBulkUpdateForm] = useState({ statusId: '', assigneeIds: [], dueDate: '' });
  const [collapsedTaskListIds, setCollapsedTaskListIds] = useState([]);
  const [loadedTaskListIds, setLoadedTaskListIds] = useState([]);
  const [loadingTaskListIds, setLoadingTaskListIds] = useState([]);
  const initializedCollapsedListsRef = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createDataLoading, setCreateDataLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditEmployees, setLoadingEditEmployees] = useState(false);
  const [editEmployeesError, setEditEmployeesError] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [expandedCommentIds, setExpandedCommentIds] = useState([]);
  const [replyToComment, setReplyToComment] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
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
  const [selectedListDetail, setSelectedListDetail] = useState(null);
  const [listDetailTasks, setListDetailTasks] = useState([]);
  const [loadingListDetail, setLoadingListDetail] = useState(false);
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
  const [quickListForm, setQuickListForm] = useState({ departmentId: '', folderId: '', listName: '' });
  const [quickListFoldersLoading, setQuickListFoldersLoading] = useState(false);
  const [quickListLoadedSpaceIds, setQuickListLoadedSpaceIds] = useState([]);
  const [savingQuickList, setSavingQuickList] = useState(false);
  const [taskFilters, setTaskFilters] = useState({ assigneeIds: [], statusId: '' });
  const [inlineTaskListId, setInlineTaskListId] = useState('');
  const [inlineTaskText, setInlineTaskText] = useState('');
  const [savingInlineTasks, setSavingInlineTasks] = useState(false);
  const [pasteConfirmation, setPasteConfirmation] = useState(null);
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
    assigneeIds: []
  });
  const availableTaskLists = useMemo(() => {
    const rows = spaceHierarchy[String(scope.spaceId)]?.lists || masters.lists;
    if (!scope.folderId) return rows;
    return rows.filter((item) => String(item.folder_id || item.folder?.id || '') === String(scope.folderId));
  }, [masters.lists, scope.folderId, scope.spaceId, spaceHierarchy]);
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
        const taskRows = responseList(response).map(normalizeApiTask);
        setTasks(taskRows);
        setLoadedTaskListIds([
          ...new Set(taskRows.map((task) => task.list_id).filter((listId) => listId !== undefined && listId !== null).map(String))
        ]);
        setSelectedTaskIds([]);
      } catch (error) {
        setTasks([]);
        showAlert(error?.response?.data?.message || 'Gagal mengambil daftar tugas.', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [scope, showAlert]
  );

  const loadTasksForList = async (list) => {
    const listId = String(list.id);
    if (!listId || loadingTaskListIds.includes(listId)) return;
    setLoadingTaskListIds((current) => [...new Set([...current, listId])]);
    try {
      const response = await TaskManagementServices.getTask({ list_id: list.id, include_subtasks: true, per_page: 100 });
      if (apiError(response)) throw new Error(response?.data?.message || 'Gagal mengambil task List Project.');
      const listTasks = responseList(response).map(normalizeApiTask);
      setTasks((current) => [...current.filter((task) => String(task.list_id) !== listId), ...listTasks]);
      setLoadedTaskListIds((current) => [...new Set([...current, listId])]);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengambil task List Project.', 'danger');
    } finally {
      setLoadingTaskListIds((current) => current.filter((id) => id !== listId));
    }
  };

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
            TaskManagementServices.getEmployee(),
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
        const listResponses = await Promise.allSettled(
          spaceRows.map((space) => TaskManagementServices.getLists({ space_id: space.id }))
        );
        const initialSpaceHierarchy = spaceRows.reduce((result, space, index) => {
          const response = listResponses[index];
          result[String(space.id)] = {
            folders: [],
            lists: response.status === 'fulfilled' && !apiError(response.value) ? responseList(response.value) : []
          };
          return result;
        }, {});
        const initialLists = Object.values(initialSpaceHierarchy).flatMap((hierarchy) => hierarchy.lists);
        setSelectedDepartmentIds([]);
        setExpandedDepartmentIds([]);
        setNewSpaceDepartmentId('');
        const nextScope = { workspaceId, spaceId: '', folderId: '', listId: '' };
        setScope(nextScope);
        setMasters({
          workspaces: workspaceRows,
          spaces: spaceRows,
          folders: [],
          lists: initialLists,
          statuses: responseList(statusesResponse),
          priorities: responseList(prioritiesResponse),
          types: responseList(typesResponse),
          employees: employeeList(employeesResponse)
        });
        setSpaceHierarchy(initialSpaceHierarchy);
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
  const commentThreads = useMemo(() => buildCommentThreads(comments), [comments]);
  const commentAuthorName = (item) => {
    const authorEmployeeId = item?.author_employee_id ?? item?.authorEmployeeId;
    const employee = authorEmployeeId == null
      ? null
      : masters.employees.find((entry) =>
          [entry.id, entry.employee_id, entry.employeeId].some((id) => id != null && String(id) === String(authorEmployeeId))
        );
    return employee
      ? entityName(employee, employee.employee_name)
      : entityName(item?.author_employee || item?.author || item?.user, item?.employee_name || (authorEmployeeId ? `Employee ${authorEmployeeId}` : 'User'));
  };
  const selectedListTasks = listDetailTasks.filter((task) => !task.parentTaskId);
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus =
          !taskFilters.statusId ||
          String(task.statusId) === String(taskFilters.statusId) ||
          task.status === statusLabel(masters.statuses.find((status) => String(status.id) === String(taskFilters.statusId)));
        const selectedEmployees = masters.employees.filter((employee) =>
          taskFilters.assigneeIds.some((id) => String(id) === String(employee.id))
        );
        const matchesAssignee =
          !taskFilters.assigneeIds.length ||
          task.assigneeIds.some((id) => taskFilters.assigneeIds.some((selectedId) => String(id) === String(selectedId))) ||
          selectedEmployees.some((employee) => task.assignees.includes(entityName(employee, employee.employee_name)));
        return matchesStatus && matchesAssignee;
      }),
    [masters.employees, masters.statuses, taskFilters.assigneeIds, taskFilters.statusId, tasks]
  );
  const allTaskListOptions = useMemo(() => {
    const rows = [
      ...tasks
        .filter((task) => task.list_id)
        .map((task) => ({
          id: task.list_id,
          list_name: task.list,
          space_id: task.space_id,
          folder_id: task.folder_id,
          folder_name: task.folder
        })),
      ...masters.lists,
      ...Object.entries(spaceHierarchy).flatMap(([spaceId, hierarchy]) =>
        (hierarchy?.lists || []).map((list) => ({ ...list, space_id: list.space_id || spaceId }))
      )
    ];
    return [...new Map(rows.filter((item) => item?.id).map((item) => [String(item.id), item])).values()].sort((first, second) =>
      entityName(first).localeCompare(entityName(second))
    );
  }, [masters.lists, spaceHierarchy, tasks]);

  const groupedListTasks = useMemo(() => {
    const visibleLists = allTaskListOptions.filter((list) => {
      const matchesSpace = !scope.spaceId || String(list.space_id || list.space?.id || '') === String(scope.spaceId);
      const matchesFolder = !scope.folderId || String(list.folder_id || list.folder?.id || '') === String(scope.folderId);
      const matchesList = !scope.listId || String(list.id) === String(scope.listId);
      return matchesSpace && matchesFolder && matchesList;
    });
    const groups = new Map(
      visibleLists.map((list) => [
        String(list.id),
        {
          key: String(list.id),
          list: entityName(list, 'Without List'),
          folder: entityName(list.folder, list.folder_name),
          department: entityName(list.department || list.space?.department, list.department_name || '-'),
          tasks: []
        }
      ])
    );
    filteredTasks.forEach((task) => {
      const key = String(task.list_id || task.list || 'without-list');
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          list: task.list || 'Without List',
          folder: task.folder || '-',
          department: task.department || '-',
          tasks: []
        });
      }
      groups.get(key).tasks.push(task);
    });
    return [...groups.values()].sort((first, second) => first.list.localeCompare(second.list));
  }, [allTaskListOptions, filteredTasks, scope.folderId, scope.listId, scope.spaceId]);
  const isAdministrator = isAdministratorRole(getCookies('role'));
  const quickListDepartment = departments.find((item) => String(item.id) === String(quickListForm.departmentId));
  const quickListSpace = quickListDepartment
    ? masters.spaces.find((item) => spaceMatchesDepartment(item, quickListDepartment))
    : null;
  const quickListFolders = quickListSpace ? spaceHierarchy[String(quickListSpace.id)]?.folders || [] : [];

  useEffect(() => {
    if (initializedCollapsedListsRef.current || !allTaskListOptions.length) return;
    initializedCollapsedListsRef.current = true;
    setCollapsedTaskListIds(allTaskListOptions.map((list) => String(list.id)));
  }, [allTaskListOptions]);

  useEffect(() => {
    if (isAdministrator || !departments.length || quickListForm.departmentId) return;
    const assignedDepartment = getOrganizationAssignment().departments[0];
    const department =
      departments.find(
        (item) =>
          String(item.id).toLowerCase() === String(assignedDepartment || '').toLowerCase() ||
          item.code.toLowerCase() === String(assignedDepartment || '').toLowerCase()
      ) || departments[0];
    setQuickListForm((current) => ({ ...current, departmentId: String(department.id), folderId: '' }));
    setSelectedDepartmentIds([String(department.id)]);
    selectDepartment(department);
    // Department non-administrator mengikuti assignment dari cookie saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, isAdministrator, quickListForm.departmentId]);

  useEffect(() => {
    const spaceId = String(quickListSpace?.id || '');
    if (!spaceId || quickListLoadedSpaceIds.includes(spaceId) || spaceHierarchy[spaceId]?.folders?.length) return;
    let active = true;
    setQuickListFoldersLoading(true);
    Promise.all([
      TaskManagementServices.getFolders({ space_id: quickListSpace.id }),
      TaskManagementServices.getLists({ space_id: quickListSpace.id })
    ])
      .then(([foldersResponse, listsResponse]) => {
        if (!active || apiError(foldersResponse) || apiError(listsResponse)) return;
        setSpaceHierarchy((current) => ({
          ...current,
          [String(quickListSpace.id)]: {
            folders: responseList(foldersResponse),
            lists: responseList(listsResponse)
          }
        }));
        setQuickListLoadedSpaceIds((current) => [...new Set([...current, spaceId])]);
      })
      .catch(() => {
        if (active) showAlert('Gagal mengambil folder untuk List Project.', 'danger');
      })
      .finally(() => {
        if (active) setQuickListFoldersLoading(false);
      });
    return () => {
      active = false;
    };
    // Fetch ulang hanya ketika Space berubah. Perubahan hasil pada spaceHierarchy tidak boleh membatalkan finally di atas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickListSpace?.id]);

  const changeTaskView = (nextView) => {
    setView(nextView);
    if (nextView !== 'list') return;
    setCollapsedTaskListIds(allTaskListOptions.map((list) => String(list.id)));
    loadTasks({ workspaceId: scope.workspaceId, spaceId: '', folderId: '', listId: '' });
  };

  const updateLocalTask = (id, changes) => setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...changes } : task)));
  const taskEditValues = (task) => ({
    title: task.title || '',
    description: task.description || '',
    priorityId: task.priorityId || '',
    startDate: toDateInput(task.startDate),
    dueDate: toDateInput(task.dueDate),
    assigneeIds: task.assigneeIds || []
  });
  const openTask = async (task) => {
    setSelectedId(task.id);
    setEditForm(taskEditValues(task));
    setComment('');
    setReplyToComment(null);
    setComments([]);
    setExpandedCommentIds([]);
    setLoadingEditEmployees(true);
    setEditEmployeesError(false);
    try {
      const [detailResult, employeesResult] = await Promise.allSettled([
        TaskManagementServices.getTaskDetail(task.id),
        TaskManagementServices.getEmployee()
      ]);
      if (detailResult.status === 'rejected') throw detailResult.reason;
      const response = detailResult.value;
      if (apiError(response)) throw new Error(response?.data?.message);
      const employeesResponse = employeesResult.status === 'fulfilled' ? employeesResult.value : null;
      if (!employeesResponse || apiError(employeesResponse)) {
        setEditEmployeesError(true);
        showAlert(employeesResponse?.data?.message || employeesResult.reason?.message || 'Gagal mengambil master employee.', 'danger');
      } else {
        setMasters((current) => ({ ...current, employees: employeeList(employeesResponse) }));
      }
      const detail = normalizeApiTask(responseData(response));
      updateLocalTask(task.id, detail);
      setEditForm(taskEditValues(detail));
      const commentsResponse = await TaskManagementServices.getComments(task.id);
      if (!apiError(commentsResponse)) setComments(responseList(commentsResponse));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengambil detail tugas.', 'danger');
    } finally {
      setLoadingEditEmployees(false);
    }
  };
  const openListDetail = async (list) => {
    setSelectedListDetail(list);
    setListDetailTasks([]);
    setLoadingListDetail(true);
    try {
      const response = await TaskManagementServices.getTask({ list_id: list.id, include_subtasks: true, per_page: 100 });
      if (apiError(response)) throw new Error(response?.data?.message || 'Gagal mengambil task List Project.');
      setListDetailTasks(responseList(response).map(normalizeApiTask));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengambil detail List Project.', 'danger');
    } finally {
      setLoadingListDetail(false);
    }
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
  const saveInlineTasks = async (list, taskText = inlineTaskText) => {
    const titles = getInlineTaskTitles(taskText);
    if (!titles.length || savingInlineTasks) return;
    const spaceId = list.space_id || list.space?.id || scope.spaceId;
    const folderId = list.folder_id || list.folder?.id || scope.folderId;
    if (!spaceId || !folderId || !list.id) {
      showAlert('Space, Folder, atau List Project tidak dapat ditentukan.', 'warning');
      return;
    }
    setSavingInlineTasks(true);
    try {
      const defaultStatusId = masters.statuses.find((item) => Number(item.id) === 1 || /to.?do/i.test(statusLabel(item)))?.id;
      const defaultPriorityId = masters.priorities.find((item) => Number(item.id) === 3 || /normal/i.test(priorityLabel(item)))?.id;
      const defaultTypeId = masters.types.find((item) => Number(item.id) === 1 || /^task$/i.test(taskTypeLabel(item)))?.id;
      const results = await Promise.allSettled(
        titles.map((title) =>
          TaskManagementServices.createTask({
            space_id: spaceId,
            folder_id: folderId,
            list_id: list.id,
            title,
            status_id: defaultStatusId || undefined,
            priority_id: defaultPriorityId || undefined,
            task_type_id: defaultTypeId || undefined
          })
        )
      );
      const failedTitles = titles.filter((_, index) => results[index].status === 'rejected' || apiError(results[index].value));
      const createdCount = titles.length - failedTitles.length;
      setInlineTaskText(failedTitles.join('\n'));
      await loadTasksForList(list);
      if (createdCount) showAlert(`${createdCount} task berhasil dibuat.`, 'success');
      if (failedTitles.length) showAlert(`${failedTitles.length} task gagal dibuat dan tetap tersedia di input.`, 'danger');
      else setInlineTaskListId('');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat task.', 'danger');
    } finally {
      setSavingInlineTasks(false);
    }
  };
  const openCreateTask = async () => {
    const departmentId =
      departments.find((department) =>
        masters.spaces.some((space) => String(space.id) === String(scope.spaceId) && spaceMatchesDepartment(space, department))
      )?.id ||
      selectedDepartmentIds[0] ||
      '';
    setForm({
      ...emptyForm,
      departmentId,
      spaceId: scope.spaceId || '',
      folderId: scope.folderId || '',
      listId: scope.listId || availableTaskLists[0]?.id || '',
      statusId: masters.statuses.find((item) => Number(item.id) === 1 || /to.?do/i.test(statusLabel(item)))?.id || '',
      priorityId: masters.priorities.find((item) => Number(item.id) === 3 || /normal/i.test(priorityLabel(item)))?.id || '',
      typeId: masters.types.find((item) => Number(item.id) === 1 || /^task$/i.test(taskTypeLabel(item)))?.id || ''
    });
    setListForm({ listName: '', description: '', colorHex: '#2563eb', defaultView: 'LIST' });
    setShowCreate(true);
    setCreateDataLoading(true);
    try {
      const employeesResponse = await TaskManagementServices.getEmployee();
      if (apiError(employeesResponse)) throw new Error(employeesResponse?.data?.message || 'Failed to load employees.');
      setMasters((current) => ({ ...current, employees: employeeList(employeesResponse) }));
    } catch (error) {
      setMasters((current) => ({ ...current, employees: [] }));
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load assignee employees.', 'danger');
    } finally {
      setCreateDataLoading(false);
    }
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
        TaskManagementServices.getEmployee()
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      setSpaceHierarchy((current) => ({ ...current, [String(space.id)]: { folders: folderRows, lists: listRows } }));
      setMasters((current) => ({ ...current, employees: employeeList(employeesResponse) }));
    } catch (error) {
      showAlert(error?.response?.data?.message || 'Failed to load department folders.', 'danger');
    } finally {
      setCreateDataLoading(false);
    }
  };
  const editTask = async (event) => {
    event.preventDefault();
    if (!selectedTask) return;
    if (editForm.startDate && editForm.dueDate && new Date(editForm.startDate) > new Date(editForm.dueDate)) {
      showAlert('Start Date tidak boleh melewati Deadline.', 'warning');
      return;
    }
    setSavingEdit(true);
    try {
      const response = await TaskManagementServices.putEditTask(selectedTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority_id: editForm.priorityId ? Number(editForm.priorityId) : undefined,
        start_date: editForm.startDate || null,
        due_date: editForm.dueDate || undefined,
        assignee_ids: editForm.assigneeIds.map(Number)
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      const detailResponse = await TaskManagementServices.getTaskDetail(selectedTask.id);
      if (!apiError(detailResponse)) {
        const updatedTask = normalizeApiTask(responseData(detailResponse));
        updateLocalTask(selectedTask.id, updatedTask);
        setEditForm(taskEditValues(updatedTask));
      }
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
  const createQuickTaskList = async () => {
    const listName = quickListForm.listName.trim();
    if (!quickListSpace?.id || !quickListForm.folderId || !listName || savingQuickList) {
      if (!quickListSpace?.id || !quickListForm.folderId) showAlert('Pilih Department dan Folder terlebih dahulu.', 'warning');
      return;
    }
    setSavingQuickList(true);
    try {
      const response = await TaskManagementServices.postListTask({
        space_id: quickListSpace.id,
        folder_id: quickListForm.folderId,
        list_name: listName,
        color_hex: '#2563eb',
        default_view: 'LIST'
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      const listsResponse = await TaskManagementServices.getLists({ space_id: quickListSpace.id });
      if (apiError(listsResponse)) throw new Error(listsResponse?.data?.message);
      const listRows = responseList(listsResponse);
      setSpaceHierarchy((current) => ({
        ...current,
        [String(quickListSpace.id)]: {
          folders: current[String(quickListSpace.id)]?.folders || [],
          lists: listRows
        }
      }));
      setMasters((current) => ({
        ...current,
        lists: [
          ...current.lists.filter((item) => String(item.space_id || item.space?.id || '') !== String(quickListSpace.id)),
          ...listRows
        ]
      }));
      setQuickListForm((current) => ({ ...current, listName: '' }));
      showAlert(`List Project ${listName} berhasil dibuat.`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal membuat List Project.', 'danger');
    } finally {
      setSavingQuickList(false);
    }
  };
  const filterTasksByQuickDepartment = async (departmentId) => {
    setQuickListForm((current) => ({ ...current, departmentId, folderId: '' }));
    setSelectedDepartmentIds(departmentId ? [String(departmentId)] : []);
    setTaskFilters((current) => ({ ...current, assigneeIds: [] }));
    if (!departmentId) {
      const nextScope = { ...scope, spaceId: '', folderId: '', listId: '' };
      setScope(nextScope);
      await loadTasks(nextScope);
      return;
    }
    const department = departments.find((item) => String(item.id) === String(departmentId));
    if (department) await selectDepartment(department);
  };
  const filterTasksByQuickFolder = async (folderId) => {
    setQuickListForm((current) => ({ ...current, folderId }));
    const nextScope = {
      ...scope,
      spaceId: quickListSpace?.id || '',
      folderId,
      listId: ''
    };
    setScope(nextScope);
    await loadTasks(nextScope);
  };
  const sendComment = async () => {
    if (!selectedTask || !comment.trim() || sendingComment) return;
    const parentCommentId = replyToComment?.id ?? null;
    setSendingComment(true);
    try {
      const response = await TaskManagementServices.postCommentTask(selectedTask.id, {
        comment_text: comment.trim(),
        parent_comment_id: parentCommentId,
        is_internal_only: false
      });
      if (apiError(response)) throw new Error(response?.data?.message);
      setComment('');
      setReplyToComment(null);
      if (parentCommentId != null) setExpandedCommentIds((current) => [...new Set([...current, String(parentCommentId)])]);
      const listResponse = await TaskManagementServices.getComments(selectedTask.id);
      if (apiError(listResponse)) throw new Error(listResponse?.data?.message || 'Gagal memuat komentar.');
      setComments(responseList(listResponse));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengirim komentar.', 'danger');
    } finally {
      setSendingComment(false);
    }
  };
  const renderCommentComposer = (isReply = false) => (
    <div className={`todo-comment-composer ${isReply ? 'is-reply' : ''}`}>
      {isReply && (
        <div className="todo-comment-composer-heading">
          <span><i className="ti ti-corner-down-right me-1" /> Reply to {commentAuthorName(replyToComment)}</span>
          <Button type="button" variant="link" size="sm" className="p-0" data-permission-action="none"
            disabled={sendingComment} onClick={() => { setReplyToComment(null); setComment(''); }}>
            Cancel
          </Button>
        </div>
      )}
      <div className="todo-comment-composer-row">
        <Form.Control as="textarea" rows={2} value={comment} disabled={sendingComment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={isReply ? 'Tulis balasan...' : 'Tulis komentar...'} />
        <Button size="sm" data-permission-action="none" disabled={!comment.trim() || sendingComment} onClick={sendComment}>
          {sendingComment ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Sending comment" /> : <i className="ti ti-send" />}
          <span>{sendingComment ? 'Sending' : 'Send'}</span>
        </Button>
      </div>
    </div>
  );
  const renderCommentThread = (node) => {
    const item = node.item;
    const key = String(item.id);
    const expanded = expandedCommentIds.includes(key);
    return (
      <div key={key} className="todo-comment-card">
        <div className="todo-comment-card-header">
          <span className="todo-comment-avatar" aria-hidden="true">{initials(commentAuthorName(item))}</span>
          <div className="todo-comment-author">
            <strong>{commentAuthorName(item)}</strong>
            {item.created_at && <small>{formatDate(item.created_at)}</small>}
          </div>
        </div>
        <div className="todo-comment-text">{item.comment_text || item.text}</div>
        <div className="todo-comment-actions">
          {node.parentId == null && (
            <Button type="button" variant="link" size="sm" className="todo-comment-action" data-permission-action="none"
              onClick={() => { setReplyToComment(item); setComment(''); }}>
              <i className="ti ti-arrow-back-up me-1" /> Reply
            </Button>
          )}
          {node.replies.length > 0 && (
            <Button type="button" variant="link" size="sm" className="todo-comment-action" data-permission-action="none"
              aria-expanded={expanded}
              onClick={() => setExpandedCommentIds((current) =>
                current.includes(key) ? current.filter((id) => id !== key) : [...current, key]
              )}>
              <i className={`ti ti-chevron-${expanded ? 'up' : 'down'} me-1`} />
              {expanded ? 'Hide' : 'Show'} {node.replies.length} {node.replies.length === 1 ? 'reply' : 'replies'}
            </Button>
          )}
        </div>
        {replyToComment?.id === item.id && renderCommentComposer(true)}
        {expanded && (
          <div className="todo-comment-replies">
            {node.replies.map(renderCommentThread)}
          </div>
        )}
      </div>
    );
  };
  const deleteTask = () =>
    showConfirm({
      title: 'Hapus tugas?',
      subTitle: `${selectedTask.code} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      skipCountdown: true,
      onConfirm: async () => {
        try {
          const response = await TaskManagementServices.deleteTask(selectedTask.id);
          if (apiError(response)) throw new Error(response?.data?.message || 'Gagal menghapus tugas.');
          setSelectedId(null);
          await loadTasks();
          showAlert('Tugas berhasil dihapus.', 'success');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Gagal menghapus tugas.', 'danger');
        }
      }
    });
  const deleteTaskFromRow = (task) =>
    showConfirm({
      title: 'Hapus tugas?',
      subTitle: `${task.code} - ${task.title} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      skipCountdown: true,
      onConfirm: async () => {
        try {
          const response = await TaskManagementServices.deleteTask(task.id);
          if (apiError(response)) throw new Error(response?.data?.message || 'Gagal menghapus tugas.');
          setSelectedTaskIds((current) => current.filter((id) => id !== String(task.id)));
          await loadTasks();
          showAlert('Tugas berhasil dihapus.', 'success');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Gagal menghapus tugas.', 'danger');
        }
      }
    });
  const deleteSelectedTasks = () => {
    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(String(task.id)));
    if (!selectedTasks.length || deletingSelectedTasks) return;

    showConfirm({
      title: `Hapus ${selectedTasks.length} task?`,
      subTitle: 'Task yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
      skipCountdown: true,
      onConfirm: async () => {
        setDeletingSelectedTasks(true);
        try {
          const results = await Promise.allSettled(selectedTasks.map((task) => TaskManagementServices.deleteTask(task.id)));
          const failedIds = selectedTasks
            .filter((_, index) => results[index].status === 'rejected' || apiError(results[index].value))
            .map((task) => String(task.id));
          const deletedCount = selectedTasks.length - failedIds.length;

          await loadTasks();
          setSelectedTaskIds(failedIds);
          if (deletedCount) showAlert(`${deletedCount} task berhasil dihapus.`, 'success');
          if (failedIds.length) showAlert(`${failedIds.length} task gagal dihapus.`, 'danger');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Gagal menghapus task.', 'danger');
        } finally {
          setDeletingSelectedTasks(false);
        }
      }
    });
  };
  const moveSelectedTasks = () => {
    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(String(task.id)));
    const targetList = allTaskListOptions.find((item) => String(item.id) === String(moveTargetListId));
    if (!selectedTasks.length || !targetList || movingSelectedTasks) return;

    showConfirm({
      title: `Pindahkan ${selectedTasks.length} task?`,
      subTitle: `Task yang dipilih akan dipindahkan ke List Project ${entityName(targetList)}.`,
      skipCountdown: true,
      onConfirm: async () => {
        setMovingSelectedTasks(true);
        try {
          const folderId = targetList.folder_id || targetList.folder?.id;
          const results = await Promise.allSettled(
            selectedTasks.map((task) =>
              TaskManagementServices.putEditTask(task.id, {
                list_id: targetList.id,
                folder_id: folderId || undefined
              })
            )
          );
          const failedIds = selectedTasks
            .filter((_, index) => results[index].status === 'rejected' || apiError(results[index].value))
            .map((task) => String(task.id));
          const movedCount = selectedTasks.length - failedIds.length;

          await loadTasks({ workspaceId: scope.workspaceId, spaceId: '', folderId: '', listId: '' });
          setSelectedTaskIds(failedIds);
          if (!failedIds.length) setMoveTargetListId('');
          if (movedCount) showAlert(`${movedCount} task berhasil dipindahkan ke ${entityName(targetList)}.`, 'success');
          if (failedIds.length) showAlert(`${failedIds.length} task gagal dipindahkan.`, 'danger');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Gagal memindahkan task.', 'danger');
        } finally {
          setMovingSelectedTasks(false);
        }
      }
    });
  };
  const copySelectedTasks = () => {
    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(String(task.id)));
    const targetList = allTaskListOptions.find((item) => String(item.id) === String(moveTargetListId));
    if (!selectedTasks.length || !targetList || copyingSelectedTasks) return;
    const folderId = targetList.folder_id || targetList.folder?.id;
    const hierarchySpaceId = Object.entries(spaceHierarchy).find(([, hierarchy]) =>
      (hierarchy?.lists || []).some((list) => String(list.id) === String(targetList.id))
    )?.[0];
    const spaceId = targetList.space_id || targetList.space?.id || hierarchySpaceId;
    if (!spaceId || !folderId) {
      showAlert('Space atau Folder tujuan tidak dapat ditentukan.', 'warning');
      return;
    }

    showConfirm({
      title: `Copy ${selectedTasks.length} task?`,
      subTitle: `Salinan task akan dibuat di List Project ${entityName(targetList)}.`,
      skipCountdown: true,
      onConfirm: async () => {
        setCopyingSelectedTasks(true);
        try {
          const results = await Promise.allSettled(
            selectedTasks.map((task) =>
              TaskManagementServices.createTask({
                space_id: spaceId,
                folder_id: folderId,
                list_id: targetList.id,
                title: task.title,
                description: task.description || '',
                status_id: task.statusId || undefined,
                priority_id: task.priorityId || undefined,
                task_type_id: task.task_type_id || task.taskTypeId || undefined,
                start_date: task.startDate || undefined,
                due_date: task.dueDate || undefined,
                estimated_hours: task.estimatedHours || undefined,
                assignee_ids: task.assigneeIds || []
              })
            )
          );
          const failedCount = results.filter((result) => result.status === 'rejected' || apiError(result.value)).length;
          const copiedCount = selectedTasks.length - failedCount;
          if (copiedCount) showAlert(`${copiedCount} task berhasil dicopy.`, 'success');
          if (failedCount) showAlert(`${failedCount} task gagal dicopy.`, 'danger');
          if (!failedCount) setMoveTargetListId('');
        } catch (error) {
          showAlert(error?.response?.data?.message || error?.message || 'Gagal mengcopy task.', 'danger');
        } finally {
          setCopyingSelectedTasks(false);
        }
      }
    });
  };
  const updateSelectedTasks = async (event) => {
    event.preventDefault();
    const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(String(task.id)));
    const hasTaskChanges = bulkUpdateForm.assigneeIds.length || bulkUpdateForm.dueDate;
    if (!selectedTasks.length || (!bulkUpdateForm.statusId && !hasTaskChanges) || savingBulkUpdate) {
      if (!bulkUpdateForm.statusId && !hasTaskChanges) showAlert('Pilih minimal satu perubahan untuk diterapkan.', 'warning');
      return;
    }
    setSavingBulkUpdate(true);
    try {
      const results = await Promise.allSettled(
        selectedTasks.map(async (task) => {
          if (bulkUpdateForm.statusId) {
            const statusResponse = await TaskManagementServices.changeStatus(task.id, bulkUpdateForm.statusId);
            if (apiError(statusResponse)) throw new Error(statusResponse?.data?.message || 'Gagal mengubah status.');
          }
          if (hasTaskChanges) {
            const updateResponse = await TaskManagementServices.putEditTask(task.id, {
              assignee_ids: bulkUpdateForm.assigneeIds.length ? bulkUpdateForm.assigneeIds.map(Number) : undefined,
              due_date: bulkUpdateForm.dueDate || undefined
            });
            if (apiError(updateResponse)) throw new Error(updateResponse?.data?.message || 'Gagal memperbarui task.');
          }
        })
      );
      const failedIds = selectedTasks.filter((_, index) => results[index].status === 'rejected').map((task) => String(task.id));
      const updatedCount = selectedTasks.length - failedIds.length;
      await loadTasks(scope);
      setSelectedTaskIds(failedIds);
      if (updatedCount) showAlert(`${updatedCount} task berhasil diperbarui.`, 'success');
      if (failedIds.length) showAlert(`${failedIds.length} task gagal diperbarui.`, 'danger');
      if (!failedIds.length) {
        setShowBulkUpdate(false);
        setBulkUpdateForm({ statusId: '', assigneeIds: [], dueDate: '' });
      }
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal memperbarui task.', 'danger');
    } finally {
      setSavingBulkUpdate(false);
    }
  };
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
        TaskManagementServices.getEmployee({ department_id: department.id })
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      const nextScope = { ...scope, spaceId: space.id, folderId: '', listId: '' };
      setScope(nextScope);
      setMasters((current) => ({
        ...current,
        folders: folderRows,
        lists: listRows,
        statuses: responseList(statusesResponse),
        employees: employeeList(employeesResponse)
      }));
      setSpaceHierarchy((current) => ({ ...current, [String(space.id)]: { folders: folderRows, lists: listRows } }));
      await loadTasks(nextScope);
    } catch (error) {
      setLoading(false);
      showAlert(error?.response?.data?.message || `Gagal memuat data department ${department.name}.`, 'danger');
    }
  };
  const changeDepartments = async (options) => {
    const ids = (options || []).map((option) => String(option.value));
    setSelectedDepartmentIds(ids);
    setExpandedDepartmentIds((current) => [...new Set([...current.filter((id) => ids.includes(id)), ...ids])]);
    if (!ids.includes(String(newSpaceDepartmentId))) setNewSpaceDepartmentId(ids[0] || '');
    if (!ids.length) {
      const nextScope = { ...scope, spaceId: '', folderId: '', listId: '' };
      setScope(nextScope);
      setMasters((current) => ({ ...current, folders: [] }));
      await loadTasks(nextScope);
      return;
    }
    if (ids.length === 1) {
      const department = departments.find((item) => String(item.id) === ids[0]);
      if (department) await selectDepartment(department);
      return;
    }
    const activeSpace = masters.spaces.find((item) => String(item.id) === String(scope.spaceId));
    const activeStillVisible =
      activeSpace &&
      departments.some((department) => ids.includes(String(department.id)) && spaceMatchesDepartment(activeSpace, department));
    if (!activeStillVisible) {
      const firstDepartment = departments.find((department) => String(department.id) === ids[0]);
      if (firstDepartment) await selectDepartment(firstDepartment);
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
        TaskManagementServices.getEmployee({ department_id: resolvedDepartmentId })
      ]);
      const folderRows = responseList(foldersResponse);
      const listRows = responseList(listsResponse);
      const nextScope = { ...scope, spaceId: space.id, folderId: '', listId: '' };
      setScope(nextScope);
      setMasters((current) => ({
        ...current,
        folders: folderRows,
        lists: listRows,
        statuses: responseList(statusesResponse),
        employees: employeeList(employeesResponse)
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
                    'Task Management'
                  )}
                </h4>
                <div className="text-muted f-12">Manage departmental work in one place.</div>
              </div>
            </div>
            <Stack direction="horizontal" gap={2}>
              <Button
                variant="outline-secondary"
                onClick={() => loadTasks()}
                disabled={loading}
              >
                <i className={`ti ti-refresh me-1 ${loading ? 'spin' : ''}`} />
                Refresh
              </Button>
              <Button data-permission-action="none" onClick={openCreateTask} disabled={loading}>
                <i className="ti ti-plus me-1" />
                New Task
              </Button>
            </Stack>
          </Stack>

          <div className="task-panel p-0 overflow-hidden">
            <div className="task-panel-toolbar">
              <div>
                <div className="text-muted f-10 text-uppercase fw-semibold">All Tasks</div>
                <div className="fw-semibold">{filteredTasks.length} task</div>
              </div>
              <Stack direction="horizontal" gap={2}>
                <div className="btn-group">
                  <Button
                    size="sm"
                    variant={view === 'list' ? 'primary' : 'outline-secondary'}
                    onClick={() => changeTaskView('list')}
                    title="List"
                  >
                    <i className="ti ti-list" />
                  </Button>
                  <Button
                    size="sm"
                    variant={view === 'board' ? 'primary' : 'outline-secondary'}
                    onClick={() => changeTaskView('board')}
                    title="Card"
                  >
                    <i className="ti ti-layout-kanban" />
                  </Button>
                </div>
              </Stack>
            </div>
            {view === 'list' ? (
              <div className="quick-list-create">
                {isAdministrator ? (
                  <Form.Select
                    size="sm"
                    className="quick-list-department"
                    aria-label="Department List Project"
                    value={quickListForm.departmentId}
                    disabled={savingQuickList}
                    onChange={(event) => filterTasksByQuickDepartment(event.target.value)}
                  >
                    <option value="">Select Department...</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <div className="quick-list-department-label" title={quickListDepartment?.name || 'Department'}>
                    <i className="ti ti-building" />
                    <span>{quickListDepartment?.name || 'Department dari akun'}</span>
                  </div>
                )}
                <Form.Select
                  size="sm"
                  className="quick-list-folder"
                  aria-label="Folder List Project"
                  value={quickListForm.folderId}
                  disabled={!quickListSpace || quickListFoldersLoading || savingQuickList}
                  onChange={(event) => filterTasksByQuickFolder(event.target.value)}
                >
                  <option value="">{quickListFoldersLoading ? 'Loading Folder...' : 'Select Folder...'}</option>
                  {quickListFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {entityName(folder)}
                    </option>
                  ))}
                </Form.Select>
                <Select
                  isMulti
                  isClearable
                  closeMenuOnSelect={false}
                  className="task-filter-assignee"
                  classNamePrefix="task-filter-assignee-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  aria-label="Filter task by assignees"
                  placeholder="All Assignees"
                  options={masters.employees.map((employee) => ({
                    value: employee.id,
                    label: entityName(employee, employee.employee_name)
                  }))}
                  value={masters.employees
                    .filter((employee) => taskFilters.assigneeIds.some((id) => String(id) === String(employee.id)))
                    .map((employee) => ({ value: employee.id, label: entityName(employee, employee.employee_name) }))}
                  onChange={(options) =>
                    setTaskFilters((current) => ({ ...current, assigneeIds: (options || []).map((option) => option.value) }))
                  }
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 1090 }),
                    control: (base) => ({ ...base, minHeight: 31, fontSize: 12 })
                  }}
                />
                <Form.Select
                  size="sm"
                  className="task-filter-status"
                  aria-label="Filter task by status"
                  value={taskFilters.statusId}
                  onChange={(event) => setTaskFilters((current) => ({ ...current, statusId: event.target.value }))}
                >
                  <option value="">All Statuses</option>
                  {masters.statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </Form.Select>
                <InputGroup size="sm" className="quick-list-name">
                  <InputGroup.Text>
                    {savingQuickList ? <span className="spinner-border spinner-border-sm" /> : <i className="ti ti-plus" />}
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    value={quickListForm.listName}
                    disabled={!quickListForm.folderId || savingQuickList}
                    placeholder="Add new List Project, lalu tekan Enter..."
                    aria-label="Nama List Project baru"
                    onChange={(event) => setQuickListForm((current) => ({ ...current, listName: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      createQuickTaskList();
                    }}
                  />
                </InputGroup>
              </div>
            ) : null}
            {view === 'list' ? (
              <Table responsive hover className="align-middle mb-0">
                {loading ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <span className="spinner-border spinner-border-sm me-2" />
                        Loading tasks...
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  groupedListTasks.map((group) => {
                    const isCollapsed = collapsedTaskListIds.includes(group.key);
                    const projectList = allTaskListOptions.find((list) => String(list.id) === group.key);
                    const completedTasks = group.tasks.filter((task) =>
                      ['done', 'completed', 'complete', 'selesai'].includes(
                        String(task.status_category || task.status || '').toLowerCase()
                      )
                    ).length;
                    const totalTasks = group.tasks.length;
                    const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    return (
                      <tbody key={group.key} className="task-list-group-body">
                        <tr className="task-list-group-row">
                          <td colSpan={7}>
                            <div className="task-list-group-heading">
                              <div className="task-list-group-main">
                                <button
                                  type="button"
                                  className="task-list-group-toggle"
                                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.list}`}
                                  aria-expanded={!isCollapsed}
                                  onClick={() => {
                                    setCollapsedTaskListIds((current) =>
                                      current.includes(group.key)
                                        ? current.filter((id) => id !== group.key)
                                        : [...current, group.key]
                                    );
                                    if (isCollapsed && projectList && !loadedTaskListIds.includes(group.key)) {
                                      loadTasksForList(projectList);
                                    }
                                  }}
                                >
                                  {loadingTaskListIds.includes(group.key) ? (
                                    <span className="spinner-border spinner-border-sm" />
                                  ) : (
                                    <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} />
                                  )}
                                </button>
                                <Form.Check
                                  type="checkbox"
                                  aria-label={`Select all tasks in ${group.list}`}
                                  checked={Boolean(
                                    group.tasks.length && group.tasks.every((task) => selectedTaskIds.includes(String(task.id)))
                                  )}
                                  disabled={!group.tasks.length || deletingSelectedTasks || movingSelectedTasks || copyingSelectedTasks}
                                  onChange={(event) => {
                                    const groupTaskIds = group.tasks.map((task) => String(task.id));
                                    setSelectedTaskIds((current) =>
                                      event.target.checked
                                        ? [...new Set([...current, ...groupTaskIds])]
                                        : current.filter((id) => !groupTaskIds.includes(id))
                                    );
                                  }}
                                />
                                <i className="ti ti-list-check" />
                                <button
                                  type="button"
                                  className="task-list-group-name"
                                  data-permission-action="none"
                                  disabled={!projectList}
                                  onClick={() => projectList && openListDetail(projectList)}
                                >
                                  {group.list}
                                </button>
                              </div>
                              <div className="task-list-group-summary">
                                <small>
                                  {group.department} / {group.folder} · {totalTasks} task
                                </small>
                                <div className="task-list-group-progress-meta">
                                  <span>{completedTasks}/{totalTasks} done</span>
                                  <div
                                    className="task-list-group-progress"
                                    role="progressbar"
                                    aria-label={`${group.list} completion`}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                    aria-valuenow={progress}
                                  >
                                    <span style={{ width: `${progress}%` }} />
                                  </div>
                                  <strong>{progress}%</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && projectList ? (
                          <tr className="task-list-inline-create-row">
                            <td colSpan={7}>
                              <InputGroup size="sm" className="task-list-inline-create">
                                <InputGroup.Text>
                                  {savingInlineTasks && String(inlineTaskListId) === group.key ? (
                                    <span className="spinner-border spinner-border-sm" />
                                  ) : (
                                    <i className="ti ti-plus" />
                                  )}
                                </InputGroup.Text>
                                <Form.Control
                                  type="text"
                                  value={String(inlineTaskListId) === group.key ? inlineTaskText : ''}
                                  disabled={savingInlineTasks}
                                  placeholder={`Add task to ${group.list}...`}
                                  aria-label={`Add task to ${group.list}`}
                                  onFocus={() => {
                                    if (String(inlineTaskListId) !== group.key) {
                                      setInlineTaskListId(projectList.id);
                                      setInlineTaskText('');
                                    }
                                  }}
                                  onChange={(event) => {
                                    setInlineTaskListId(projectList.id);
                                    setInlineTaskText(event.target.value);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' || !event.currentTarget.value.trim()) return;
                                    event.preventDefault();
                                    saveInlineTasks(projectList, event.currentTarget.value);
                                  }}
                                  onPaste={(event) => {
                                    const pastedText = event.clipboardData.getData('text');
                                    const titles = getInlineTaskTitles(pastedText);
                                    if (!titles.length) return;
                                    event.preventDefault();
                                    setInlineTaskListId(projectList.id);
                                    setInlineTaskText(pastedText);
                                    setPasteConfirmation({
                                      target: event.currentTarget,
                                      list: projectList,
                                      listName: group.list,
                                      text: pastedText,
                                      count: titles.length
                                    });
                                  }}
                                />
                              </InputGroup>
                              <Overlay
                                show={String(pasteConfirmation?.list?.id) === group.key}
                                target={pasteConfirmation?.target}
                                placement="bottom-start"
                                flip={false}
                                container={typeof document !== 'undefined' ? document.body : null}
                                containerPadding={8}
                                rootClose
                                onHide={() => setPasteConfirmation(null)}
                              >
                                {({ ref, style, placement }) => (
                                  <div
                                    ref={ref}
                                    role="tooltip"
                                    className="task-paste-confirm-tooltip"
                                    data-popper-placement={placement}
                                    style={style}
                                  >
                                    <button
                                      type="button"
                                      className="task-paste-confirm-close"
                                      aria-label="Close paste confirmation"
                                      onClick={() => setPasteConfirmation(null)}
                                    >
                                      <i className="ti ti-x" />
                                    </button>
                                    <strong>{pasteConfirmation?.count || 0} row akan dibuat</strong>
                                    <span>Tambahkan sebagai task ke {pasteConfirmation?.listName}?</span>
                                    <div className="task-paste-confirm-actions">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="link"
                                        className="task-paste-confirm-create"
                                        onClick={() => {
                                          const pending = pasteConfirmation;
                                          setPasteConfirmation(null);
                                          if (pending) saveInlineTasks(pending.list, pending.text);
                                        }}
                                      >
                                        Create
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Overlay>
                            </td>
                          </tr>
                        ) : null}
                        {!isCollapsed && loadedTaskListIds.includes(group.key) && !group.tasks.length ? (
                          <tr className="task-list-empty-row">
                            <td colSpan={7} className="text-muted f-11">
                              No Tasks in this List Project.
                            </td>
                          </tr>
                        ) : null}
                        {!isCollapsed && group.tasks.map((task) => (
                        <tr
                          className="task-list-item-row"
                          key={task.id}
                          role="button"
                          data-permission-action="none"
                          onClick={() => openTask(task)}
                        >
                          <td colSpan={7}>
                            <div className="task-list-simple-row">
                              <Form.Check
                                type="checkbox"
                                className="task-list-item-check"
                                aria-label={`Select ${task.title}`}
                                checked={selectedTaskIds.includes(String(task.id))}
                                disabled={deletingSelectedTasks || movingSelectedTasks || copyingSelectedTasks}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  const taskId = String(task.id);
                                  setSelectedTaskIds((current) =>
                                    event.target.checked ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId)
                                  );
                                }}
                              />
                              <span className="task-list-simple-title">{task.title}</span>
                              <div className="task-list-simple-meta">
                                <div className="task-list-meta-item task-list-meta-assignee">
                                  <small>Assignee</small>
                                  {task.assignees.length ? <AvatarStack names={task.assignees} /> : <span>-</span>}
                                </div>
                                <div className="task-list-meta-item">
                                  <small>Status</small>
                                  <StatusBadge status={task.status} />
                                </div>
                                <div className="task-list-meta-item task-list-meta-due-date">
                                  <small>Due Date</small>
                                  <span className={isOverdue(task) ? 'overdue' : ''}>{formatDate(task.dueDate)}</span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline-danger"
                                className="task-row-delete"
                                data-permission-action="none"
                                aria-label={`Delete ${task.title}`}
                                title="Delete task"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteTaskFromRow(task);
                                }}
                              >
                                <i className="ti ti-trash" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    );
                  })
                )}
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
                                  <div className="kanban-task-context mb-2">
                                    <span>
                                      <i className="ti ti-building me-1" />
                                      {task.department || '-'}
                                    </span>
                                    <span>
                                      <i className="ti ti-folder me-1" />
                                      {task.folder || '-'}
                                    </span>
                                    <span>
                                      <i className="ti ti-list-check me-1" />
                                      {task.list || '-'}
                                    </span>
                                  </div>
                                  <div className="kanban-card-meta d-flex justify-content-between mb-2">
                                    <PriorityBadge priority={task.priority} />
                                    <AvatarStack names={task.assignees} />
                                  </div>
                                  <div className="d-flex justify-content-end text-muted f-10">
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
            {!loading && (view === 'board' ? !filteredTasks.length : !groupedListTasks.length) && (
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
          {view === 'list' && selectedTaskIds.length ? (
            <div className="task-bulk-floating-bar" role="region" aria-label="Selected task actions">
              <span className="task-bulk-selection-count">
                <strong>{selectedTaskIds.length}</strong> selected
              </span>
              <Form.Select
                size="sm"
                className="task-bulk-list-select"
                aria-label="Select destination List Project for Move or Copy"
                value={moveTargetListId}
                disabled={movingSelectedTasks || copyingSelectedTasks || deletingSelectedTasks}
                onChange={(event) => setMoveTargetListId(event.target.value)}
              >
                <option value="">Select destination List Project...</option>
                {allTaskListOptions.map((list) => (
                  <option key={list.id} value={list.id}>
                    {entityName(list)}{entityName(list.folder, list.folder_name) !== '-' ? ` — ${entityName(list.folder, list.folder_name)}` : ''}
                  </option>
                ))}
              </Form.Select>
              <Button
                type="button"
                size="sm"
                variant="primary"
                data-permission-action="none"
                disabled={!moveTargetListId || movingSelectedTasks || copyingSelectedTasks || deletingSelectedTasks}
                onClick={moveSelectedTasks}
              >
                {movingSelectedTasks ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ti ti-arrow-move-right me-1" />}
                Move
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline-primary"
                data-permission-action="none"
                disabled={!moveTargetListId || movingSelectedTasks || copyingSelectedTasks || deletingSelectedTasks}
                onClick={copySelectedTasks}
              >
                {copyingSelectedTasks ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ti ti-copy me-1" />}
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline-secondary"
                data-permission-action="none"
                disabled={movingSelectedTasks || copyingSelectedTasks || deletingSelectedTasks || savingBulkUpdate}
                onClick={() => {
                  setBulkUpdateForm({ statusId: '', assigneeIds: [], dueDate: '' });
                  setShowBulkUpdate(true);
                }}
              >
                <i className="ti ti-edit me-1" />
                Update
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                data-permission-action="none"
                disabled={deletingSelectedTasks || movingSelectedTasks || copyingSelectedTasks || savingBulkUpdate}
                onClick={deleteSelectedTasks}
              >
                {deletingSelectedTasks ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ti ti-trash me-1" />}
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                variant="light-secondary"
                className="task-bulk-clear"
                data-permission-action="none"
                aria-label="Clear task selection"
                title="Clear selection"
                disabled={deletingSelectedTasks || movingSelectedTasks || copyingSelectedTasks}
                onClick={() => {
                  setSelectedTaskIds([]);
                  setMoveTargetListId('');
                }}
              >
                <i className="ti ti-x" />
              </Button>
            </div>
          ) : null}
        </main>
      </div>

      <Modal
        className="todo-task-modal"
        show={showBulkUpdate}
        onHide={() => !savingBulkUpdate && setShowBulkUpdate(false)}
        centered
      >
        <Form onSubmit={updateSelectedTasks}>
          <Modal.Header closeButton={!savingBulkUpdate}>
            <Modal.Title>Update {selectedTaskIds.length} Selected Tasks</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted f-11 mb-3">Field yang dikosongkan tidak akan mengubah data task.</p>
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={bulkUpdateForm.statusId}
                  disabled={savingBulkUpdate}
                  onChange={(event) => setBulkUpdateForm((current) => ({ ...current, statusId: event.target.value }))}
                >
                  <option value="">Keep current status</option>
                  {masters.statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                  type="date"
                  value={bulkUpdateForm.dueDate}
                  disabled={savingBulkUpdate}
                  onChange={(event) => setBulkUpdateForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Assignee</Form.Label>
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  classNamePrefix="task-form-select"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isDisabled={savingBulkUpdate}
                  placeholder="Keep current assignees"
                  options={masters.employees.map((employee) => ({
                    value: employee.id,
                    label: `${entityName(employee, employee.employee_name)}${employee.nik ? ` · ${employee.nik}` : ''}`
                  }))}
                  value={masters.employees
                    .filter((employee) => bulkUpdateForm.assigneeIds.some((id) => String(id) === String(employee.id)))
                    .map((employee) => ({
                      value: employee.id,
                      label: `${entityName(employee, employee.employee_name)}${employee.nik ? ` · ${employee.nik}` : ''}`
                    }))}
                  onChange={(options) =>
                    setBulkUpdateForm((current) => ({ ...current, assigneeIds: (options || []).map((option) => option.value) }))
                  }
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light-secondary"
              disabled={savingBulkUpdate}
              onClick={() => setShowBulkUpdate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" data-permission-action="none" disabled={savingBulkUpdate}>
              {savingBulkUpdate ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-check me-1" />}
              Apply Update
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Offcanvas show={Boolean(selectedTask)} onHide={() => setSelectedId(null)} placement="end" className="todo-detail-drawer">
        {selectedTask && (
          <>
            <Offcanvas.Header closeButton>
              <div className="flex-grow-1">
                <div className="task-code mb-1">{selectedTask.code}</div>
                <Offcanvas.Title>{selectedTask.title}</Offcanvas.Title>
              </div>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Form onSubmit={editTask}>
                <Row className="g-3 mb-4">
                  <Col xs={12}>
                    <Form.Label>Title *</Form.Label>
                    <Form.Control required disabled={savingEdit} value={editForm.title}
                      onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
                  </Col>
                  <Col sm={6}>
                    <Form.Label>Status</Form.Label>
                    <Form.Select size="sm" value={selectedTask.statusId || selectedTask.status}
                      onChange={(event) => changeTaskStatus(selectedTask, event.target.value)}>
                      {(masters.statuses.length ? masters.statuses : statuses).map((item) => (
                        <option key={item.id || item} value={item.id || item}>
                          {typeof item === 'object' ? statusLabel(item) : item}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col sm={6}>
                    <Form.Label>Priority</Form.Label>
                    <Form.Select disabled={savingEdit} value={editForm.priorityId}
                      onChange={(event) => setEditForm((current) => ({ ...current, priorityId: event.target.value }))}>
                      <option value="">Select Priority</option>
                      {masters.priorities.map((item) => (
                        <option key={item.id} value={item.id}>{priorityLabel(item)}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col xs={12}>
                    <Form.Label>Assignees</Form.Label>
                    <Select isMulti isDisabled={savingEdit || loadingEditEmployees || editEmployeesError}
                      isLoading={loadingEditEmployees} closeMenuOnSelect={false}
                      classNamePrefix="task-assignee-select" menuPortalTarget={document.body} menuPosition="fixed"
                      options={masters.employees.map((item) => ({
                        value: item.id,
                        label: `${entityName(item, item.employee_name)}${item.nik ? ` · ${item.nik}` : ''}`
                      }))}
                      value={masters.employees.filter((item) => editForm.assigneeIds.some((id) => String(id) === String(item.id)))
                        .map((item) => ({
                          value: item.id,
                          label: `${entityName(item, item.employee_name)}${item.nik ? ` · ${item.nik}` : ''}`
                        }))}
                      onChange={(options) => setEditForm((current) => ({ ...current, assigneeIds: (options || []).map((option) => option.value) }))}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 1090 }) }}
                      placeholder={loadingEditEmployees ? 'Loading employees...' : 'Select assignees...'} />
                  </Col>
                  <Col sm={6}>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control type="date" disabled={savingEdit} value={editForm.startDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} />
                  </Col>
                  <Col sm={6}>
                    <Form.Label>Deadline</Form.Label>
                    <Form.Control type="date" disabled={savingEdit} value={editForm.dueDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} />
                  </Col>
                  <Col xs={12}>
                    <Form.Label>Description</Form.Label>
                    <Form.Control as="textarea" rows={3} disabled={savingEdit} value={editForm.description}
                      onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
                  </Col>
                </Row>
                <div className="d-flex justify-content-end gap-2 mb-4">
                  <Button type="button" variant="outline-danger" data-permission-action="none" disabled={savingEdit} onClick={deleteTask}>
                    <i className="ti ti-trash me-1" />
                    Delete Task
                  </Button>
                  <Button type="submit" data-permission-action="none"
                    disabled={savingEdit || !editForm.title.trim()}>
                    {savingEdit ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
                    {savingEdit ? 'Updating...' : 'Update Task'}
                  </Button>
                </div>
              </Form>
              <Tabs defaultActiveKey="comments" className="todo-conversation-tabs mb-3">
                <Tab eventKey="comments" title={<><i className="ti ti-message-circle me-2" />Comments <span className="todo-tab-count">{comments.length}</span></>}>
                  <div className="todo-comment-list">
                    {commentThreads.map(renderCommentThread)}
                    {!commentThreads.length && <div className="todo-comment-empty">Belum ada komentar. Mulai percakapan di bawah.</div>}
                  </div>
                  {!replyToComment && renderCommentComposer()}
                </Tab>
                <Tab eventKey="activity" title={<><i className="ti ti-activity me-2" />Activity</>}>
                  <div className="todo-activity-list">
                  {selectedTask.activityLogs?.map((item) => (
                    <div className="todo-activity-item" key={item.id}>
                      <p className="mb-1">
                        <strong>{entityName(item.user, item.employee_name || 'System')}</strong> {item.description || item.action}
                      </p>
                      <p className="text-muted mb-0">
                        {item.created_at ? formatDate(item.created_at.slice(0, 10)) : 'Aktivitas terbaru'}
                      </p>
                    </div>
                  ))}
                  {!selectedTask.activityLogs?.length ? <div className="todo-comment-empty">Belum ada aktivitas.</div> : null}
                  </div>
                </Tab>
              </Tabs>
            </Offcanvas.Body>
          </>
        )}
      </Offcanvas>

      <Offcanvas
        show={Boolean(selectedListDetail)}
        onHide={() => {
          setSelectedListDetail(null);
          setListDetailTasks([]);
        }}
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
                      masters.folders.find(
                        (item) => String(item.id) === String(selectedListDetail.folder_id || selectedListDetail.folder?.id)
                      ),
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
                {loadingListDetail ? (
                  <div className="text-center text-muted py-4">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading tasks...
                  </div>
                ) : null}
                {!loadingListDetail && !selectedListTasks.length ? (
                  <div className="list-detail-empty text-center text-muted py-4">
                    <i className="ti ti-clipboard-off f-24" />
                    <div className="mt-2 f-12">No Tasks in this List.</div>
                  </div>
                ) : null}
                {!loadingListDetail &&
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

      <Modal className="todo-task-modal todo-create-modal" show={showCreate} onHide={() => setShowCreate(false)} size="xl" centered>
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
