import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ReportingServices from '../../../services/corporate/ReportingServices';
import { useAlert } from '../../../utils/alertContext';

const pageSize = 10;
const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 34, fontSize: '0.75rem' }),
  valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const createFilters = () => ({
  search: '',
  space_id: '',
  folder_id: '',
  list_id: '',
  status: '',
  assignee: '',
  priority: '',
  start_date_from: '',
  due_date_to: ''
});

const getTaskList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['tasks', 'items', 'rows', 'results', 'data']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const getTaskDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  return payload?.task && !Array.isArray(payload.task) ? payload.task : payload;
};

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const formatDate = (value) => {
  if (!value) return '-';
  const numericValue = Number(value);
  const date = new Date(Number.isFinite(numericValue) && String(value).length >= 10 ? numericValue : value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeTask = (task = {}, index = 0) => {
  const status = task.status && typeof task.status === 'object' ? task.status.status || task.status.name : task.status;
  const priority = task.priority && typeof task.priority === 'object' ? task.priority.priority || task.priority.name : task.priority;
  const rawAssignees = Array.isArray(task.assignees)
    ? task.assignees
    : task.assignee && typeof task.assignee === 'object'
      ? [task.assignee]
      : [];
  const assignees = rawAssignees.length
    ? rawAssignees
        .map((item) => item.username || item.name || item.email)
        .filter(Boolean)
        .join(', ')
    : getValue(task, ['assignee_name'], typeof task.assignee === 'string' ? task.assignee : '');
  const spaceObject = task.space && typeof task.space === 'object' ? task.space : {};
  const space = spaceObject.name || spaceObject.id || task.space;
  const folder = task.folder && typeof task.folder === 'object' ? task.folder : {};
  const list = task.list && typeof task.list === 'object' ? task.list : {};
  const assigneeOptions = rawAssignees.length
    ? rawAssignees
        .map((item) => ({
          value: String(item.id || item.email || item.username || item.name || ''),
          label: item.username || item.name || item.email || String(item.id || '')
        }))
        .filter((option) => option.value)
    : assignees
      ? [{ value: String(assignees), label: String(assignees) }]
      : [];

  return {
    id: getValue(task, ['id', 'task_id'], index),
    name: getValue(task, ['name', 'task_name', 'title'], '-'),
    space: space || getValue(task, ['space_name', 'space_id'], '-'),
    spaceId: String(spaceObject.id || spaceObject.name || getValue(task, ['space_id', 'space_name']) || ''),
    folderId: String(folder.id || folder.name || getValue(task, ['folder_id', 'folder_name']) || ''),
    folderName: folder.name || getValue(task, ['folder_name'], '-'),
    listId: String(list.id || list.name || getValue(task, ['list_id', 'list_name']) || ''),
    listName: list.name || getValue(task, ['list_name'], '-'),
    status: status || '-',
    assignees: assignees || '-',
    assigneeOptions,
    priority: priority || '-',
    startDate: getValue(task, ['start_date', 'startDate']),
    dueDate: getValue(task, ['due_date', 'dueDate']),
    url: getValue(task, ['url', 'task_url']),
    description: getValue(task, ['description', 'text_content', 'content'], '-'),
    raw: task
  };
};

const statusVariant = (status) =>
  ({ complete: 'success', completed: 'success', closed: 'success', 'in progress': 'primary', open: 'secondary' })[
    String(status || '').toLowerCase()
  ] || 'info';

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase();
const isCompletedTask = (task) => ['complete', 'completed', 'closed', 'done', 'resolved'].includes(normalizeStatus(task.status));
const isInProgressTask = (task) => ['in progress', 'in_progress', 'doing', 'active'].includes(normalizeStatus(task.status));
const getTaskDate = (value) => {
  if (!value) return null;
  const numericValue = Number(value);
  const date = new Date(Number.isFinite(numericValue) && String(value).length >= 10 ? numericValue : value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
const isOverdueTask = (task) => {
  const dueDate = getTaskDate(task.dueDate);
  return Boolean(dueDate && !isCompletedTask(task) && dueDate < startOfToday());
};
const isDueSoonTask = (task) => {
  const dueDate = getTaskDate(task.dueDate);
  if (!dueDate || isCompletedTask(task)) return false;
  const today = startOfToday();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  return dueDate >= today && dueDate <= sevenDaysFromNow;
};
const uniqueOptions = (options) => [
  ...new Map(options.filter((option) => option?.value).map((option) => [String(option.value), option])).values()
];
const assigneeColors = ['#0d6efd', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2'];
const getInitials = (name) => {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};
const getAssigneeColor = (name) => {
  const index = [...String(name || '')].reduce((total, character) => total + character.charCodeAt(0), 0) % assigneeColors.length;
  return assigneeColors[index];
};
const AssigneeInitials = ({ assignees = [] }) =>
  assignees.length ? (
    <div className="d-flex flex-wrap gap-1">
      {assignees.map((assignee) => {
        const color = getAssigneeColor(assignee.label);
        return (
          <span key={assignee.value} title={assignee.label} className="d-inline-flex align-items-center gap-2">
            <span
              className="d-inline-flex flex-shrink-0 align-items-center justify-content-center fw-semibold text-white"
              style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: color, fontSize: 11 }}
            >
              {getInitials(assignee.label)}
            </span>
            <span className="f-12 text-body">{assignee.label}</span>
          </span>
        );
      })}
    </div>
  ) : (
    <span className="text-muted">-</span>
  );

export default function TaskManagement() {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState(createFilters);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSummary, setActiveSummary] = useState('total');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchTasks = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.start_date_from && query.due_date_to && new Date(query.start_date_from) > new Date(query.due_date_to)) {
        showAlert('Start date cannot be after due date', 'warning');
        return;
      }

      setLoading(true);
      try {
        const response = await ReportingServices.getAllTaskClickUp(query);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch ClickUp tasks');
        setTasks(getTaskList(response).map(normalizeTask));
        setCurrentPage(1);
        setActiveSummary('total');
      } catch (error) {
        setTasks([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch ClickUp tasks', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    fetchTasks(createFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const completed = tasks.filter(isCompletedTask).length;
    return {
      total: tasks.length,
      inProgress: tasks.filter(isInProgressTask).length,
      completed,
      overdue: tasks.filter(isOverdueTask).length,
      dueSoon: tasks.filter(isDueSoonTask).length,
      completionRate: tasks.length ? (completed / tasks.length) * 100 : 0
    };
  }, [tasks]);

  const taskFilterOptions = useMemo(
    () => ({
      spaces: uniqueOptions(tasks.map((task) => ({ value: task.spaceId, label: task.space === '-' ? task.spaceId : task.space }))),
      assignees: uniqueOptions(tasks.flatMap((task) => task.assigneeOptions)),
      folders: uniqueOptions(
        tasks.map((task) => ({ value: task.folderId, label: task.folderName === '-' ? task.folderId : task.folderName }))
      ),
      lists: uniqueOptions(tasks.map((task) => ({ value: task.listId, label: task.listName === '-' ? task.listId : task.listName }))),
      priorities: uniqueOptions(
        tasks.map((task) => ({ value: task.priority === '-' ? '' : task.priority, label: task.priority === '-' ? '' : task.priority }))
      ),
      statuses: uniqueOptions(
        tasks.map((task) => ({ value: task.status === '-' ? '' : task.status, label: task.status === '-' ? '' : task.status }))
      )
    }),
    [tasks]
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filters.space_id && task.spaceId !== String(filters.space_id)) return false;
        if (filters.folder_id && task.folderId !== String(filters.folder_id)) return false;
        if (filters.list_id && task.listId !== String(filters.list_id)) return false;
        if (filters.status && normalizeStatus(task.status) !== normalizeStatus(filters.status)) return false;
        if (filters.priority && normalizeStatus(task.priority) !== normalizeStatus(filters.priority)) return false;
        if (filters.assignee && !task.assigneeOptions.some((option) => option.value === String(filters.assignee))) return false;
        if (activeSummary === 'inProgress') return isInProgressTask(task);
        if (activeSummary === 'completed') return isCompletedTask(task);
        if (activeSummary === 'overdue') return isOverdueTask(task);
        if (activeSummary === 'dueSoon') return isDueSoonTask(task);
        return true;
      }),
    [activeSummary, filters.assignee, filters.folder_id, filters.list_id, filters.priority, filters.space_id, filters.status, tasks]
  );

  const pageCount = Math.max(Math.ceil(filteredTasks.length / pageSize), 1);
  const paginatedTasks = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    return filteredTasks.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [currentPage, filteredTasks, pageCount]);

  const selectSummary = (key) => {
    setActiveSummary(key);
    setCurrentPage(1);
  };

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const handleReset = () => {
    const defaults = createFilters();
    setFilters(defaults);
    fetchTasks(defaults);
  };

  const handleViewTask = async (task) => {
    setLoadingDetailId(task.id);
    try {
      const response = await ReportingServices.getDetailTaskClickUp(task.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch task detail');
      setSelectedTask(normalizeTask({ ...task.raw, ...getTaskDetail(response) }));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch task detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleSyncTasks = async () => {
    setSyncing(true);
    try {
      const response = await ReportingServices.syncTaskClickUp();
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to sync ClickUp tasks');
      showAlert(response?.data?.message || 'ClickUp tasks synchronized successfully', 'success');
      await fetchTasks(filters);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to sync ClickUp tasks', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  const summaryCards = [
    {
      key: 'total',
      label: 'Total Tasks',
      value: summary.total,
      description: 'Menampilkan semua task',
      icon: 'ti ti-clipboard',
      color: '#6366f1',
      background: '#f1f2ff'
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: summary.inProgress,
      description: 'Sedang dikerjakan tim',
      icon: 'ti ti-bolt',
      color: '#60a5fa',
      background: '#f0f7ff'
    },
    {
      key: 'completed',
      label: 'Completed',
      value: summary.completed,
      description: 'Telah selesai / resolved',
      icon: 'ti ti-check',
      color: '#059669',
      background: '#dcfce7'
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: summary.overdue,
      description: 'Melewati deadline',
      icon: 'ti ti-clock',
      color: '#e11d48',
      background: '#ffe4e6'
    },
    {
      key: 'dueSoon',
      label: 'Due Soon',
      value: summary.dueSoon,
      description: 'Jatuh tempo 7 hari ke depan',
      icon: 'ti ti-alert-triangle',
      color: '#d97706',
      background: '#fef3c7'
    }
  ];

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Task Management</h5>
          <span className="text-muted f-12">Monitor and filter tasks synchronized from ClickUp.</span>
        </Stack>
      }
      secondary={
        <Stack direction="horizontal" gap={2}>
          <Button variant="primary" size="sm" disabled={syncing || loading} onClick={handleSyncTasks}>
            {syncing ? <span className="spinner-border spinner-border-sm me-1" role="status" /> : <i className="ti ti-refresh me-1" />}
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button variant={showFilters ? 'light-secondary' : 'outline-primary'} size="sm" onClick={() => setShowFilters((show) => !show)}>
            <i className={`ti ${showFilters ? 'ti-x' : 'ti-filter'} me-1`} />
            {showFilters ? 'Tutup Filter' : 'Filter'}
          </Button>
        </Stack>
      }
    >
      {showFilters ? (
        <Card className="border mb-3">
          <Card.Body className="p-3">
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                fetchTasks();
              }}
            >
              <Row className="g-2 align-items-end">
                <Col md={12} xl={6}>
                  <Form.Label className="f-12 mb-1">Pencarian Bebas (Task / PIC / Komentar)</Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-white border-end-0">
                      <i className="ti ti-search text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      className="border-start-0 ps-0"
                      value={filters.search}
                      placeholder="Cari nama task, task ID ClickUp, assignee..."
                      onChange={(event) => updateFilter('search', event.target.value)}
                    />
                  </InputGroup>
                </Col>
                {[
                  ['space_id', 'Space', taskFilterOptions.spaces],
                  ['folder_id', 'Folder', taskFilterOptions.folders]
                ].map(([field, label, options]) => (
                  <Col md={6} xl={3} key={field}>
                    <Form.Label className="f-12 mb-1">{label}</Form.Label>
                    <Select
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      options={options}
                      value={options.find((option) => String(option.value) === String(filters[field])) || null}
                      isClearable
                      placeholder={`Semua ${label}`}
                      onChange={(option) => updateFilter(field, option?.value || '')}
                    />
                  </Col>
                ))}
                {[
                  ['list_id', 'List', taskFilterOptions.lists],
                  ['assignee', 'Assignee (PIC)', taskFilterOptions.assignees],
                  ['status', 'Status', taskFilterOptions.statuses],
                  ['priority', 'Priority', taskFilterOptions.priorities]
                ].map(([field, label, options]) => (
                  <Col md={6} xl={3} key={field}>
                    <Form.Label className="f-12 mb-1">{label}</Form.Label>
                    <Select
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      options={options}
                      value={options.find((option) => String(option.value) === String(filters[field])) || null}
                      isClearable
                      placeholder={`Semua ${label.replace(' (PIC)', '')}`}
                      onChange={(option) => updateFilter(field, option?.value || '')}
                    />
                  </Col>
                ))}
                <Col md={6} xl={3}>
                  <Form.Label className="f-12 mb-1">Start Date Dari</Form.Label>
                  <Form.Control
                    size="sm"
                    type="date"
                    value={filters.start_date_from}
                    onChange={(event) => updateFilter('start_date_from', event.target.value)}
                  />
                </Col>
                <Col md={6} xl={3}>
                  <Form.Label className="f-12 mb-1">Due Date Sampai</Form.Label>
                  <Form.Control
                    size="sm"
                    type="date"
                    value={filters.due_date_to}
                    onChange={(event) => updateFilter('due_date_to', event.target.value)}
                  />
                </Col>
                <Col md={6} xl={3}>
                  <Stack direction="horizontal" gap={2}>
                    <Button type="submit" size="sm" className="flex-grow-1" disabled={loading}>
                      <i className="ti ti-search me-1" /> {loading ? 'Loading...' : 'Search'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="light-secondary"
                      disabled={loading}
                      onClick={handleReset}
                      aria-label="Reset filters"
                    >
                      <i className="ti ti-refresh" />
                    </Button>
                  </Stack>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      ) : null}

      <div className="d-flex flex-nowrap gap-2 mb-2 overflow-auto px-2 pt-3 pb-3">
        {summaryCards.map((card) => {
          const isActive = activeSummary === card.key;
          return (
            <div key={card.key} style={{ flex: '1 1 0', minWidth: 190 }}>
              <Card
                as="button"
                type="button"
                className="w-100 h-100 text-start"
                onClick={() => selectSummary(card.key)}
                style={{
                  border: `${isActive ? 3 : 1}px solid ${isActive ? card.color : '#dbe3ee'}`,
                  background: isActive ? card.background : '#fff',
                  borderRadius: 14,
                  boxShadow: isActive ? `0 8px 24px ${card.color}22` : '0 2px 8px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.2s ease'
                }}
                aria-pressed={isActive}
              >
                <Card.Body className="p-2 d-flex flex-column" style={{ minHeight: 175 }}>
                  <Stack direction="horizontal" className="justify-content-between align-items-start mb-2">
                    <span className="fw-semibold f-13" style={{ color: isActive ? card.color : '#475569' }}>
                      {card.label}
                    </span>
                    <span
                      className="d-inline-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, borderRadius: 11, color: card.color, background: card.background }}
                    >
                      <i className={`${card.icon} f-18`} />
                    </span>
                  </Stack>
                  <div className="fw-bold mb-1" style={{ color: card.key === 'total' ? '#0f172a' : card.color, fontSize: 30 }}>
                    {card.value}
                  </div>
                  {card.key === 'total' ? (
                    <Stack direction="horizontal" className="justify-content-between text-muted f-12">
                      <span>Completion Rate:</span>
                      <span className="fw-semibold" style={{ color: '#059669' }}>
                        {summary.completionRate.toFixed(1)}%
                      </span>
                    </Stack>
                  ) : (
                    <div className="text-muted f-12">{card.description}</div>
                  )}
                  <div className="border-top pt-2 mt-auto f-12" style={{ color: isActive ? card.color : '#94a3b8' }}>
                    {isActive ? `✓ ${card.description}` : 'Klik untuk filter data'}
                    <span className="float-end">→</span>
                  </div>
                </Card.Body>
              </Card>
            </div>
          );
        })}
      </div>

      <Table responsive hover className="mb-0 align-middle">
        <thead>
          <tr>
            <th>Task</th>
            <th>Space</th>
            <th>Folder / List</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Priority</th>
            <th>Start Date</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="text-center py-5">
                <span className="spinner-border spinner-border-sm text-primary me-2" /> Loading ClickUp tasks...
              </td>
            </tr>
          ) : paginatedTasks.length ? (
            paginatedTasks.map((task) => (
              <tr key={task.id}>
                <td
                  className="fw-semibold"
                  style={{ minWidth: 220, maxWidth: 360, whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.5 }}
                >
                  <Button
                    variant="link"
                    className="d-block p-0 border-0 text-start text-decoration-none fw-semibold"
                    disabled={loadingDetailId !== null}
                    onClick={() => handleViewTask(task)}
                  >
                    {String(loadingDetailId) === String(task.id) ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status" />
                    ) : null}
                    {task.name}
                  </Button>
                </td>
                <td>{task.space}</td>
                <td style={{ minWidth: 180 }}>
                  <div className="fw-semibold">{task.folderName}</div>
                  <div className="text-muted f-12">{task.listName}</div>
                </td>
                <td>
                  <Badge
                    bg={isInProgressTask(task) ? '' : statusVariant(task.status)}
                    className={isInProgressTask(task) ? 'text-white' : undefined}
                    style={isInProgressTask(task) ? { backgroundColor: '#60a5fa' } : undefined}
                  >
                    {task.status}
                  </Badge>
                </td>
                <td>
                  <AssigneeInitials assignees={task.assigneeOptions} />
                </td>
                <td>{task.priority}</td>
                <td>{formatDate(task.startDate)}</td>
                <td>{formatDate(task.dueDate)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center text-muted py-5">
                No ClickUp tasks found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {!loading && filteredTasks.length > 0 ? (
        <TablePagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filteredTasks.length}
          itemLabel="tasks"
        />
      ) : null}

      <Modal show={Boolean(selectedTask)} onHide={() => setSelectedTask(null)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Task Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask ? (
            <Stack gap={4}>
              <div>
                <h5 className="mb-2">{selectedTask.name}</h5>
                <Stack direction="horizontal" gap={2}>
                  <Badge
                    bg={isInProgressTask(selectedTask) ? '' : statusVariant(selectedTask.status)}
                    className={isInProgressTask(selectedTask) ? 'text-white' : undefined}
                    style={isInProgressTask(selectedTask) ? { backgroundColor: '#60a5fa' } : undefined}
                  >
                    {selectedTask.status}
                  </Badge>
                  <Badge bg="light-secondary" text="dark">
                    {selectedTask.priority}
                  </Badge>
                </Stack>
              </div>

              <Row className="g-3">
                {[
                  ['Space', selectedTask.space],
                  ['Folder', selectedTask.folderName],
                  ['List', selectedTask.listName],
                  ['Assignee', <AssigneeInitials key="assignees" assignees={selectedTask.assigneeOptions} />],
                  ['Start Date', formatDate(selectedTask.startDate)],
                  ['Due Date', formatDate(selectedTask.dueDate)]
                ].map(([label, value]) => (
                  <Col md={4} key={label}>
                    <Form.Label className="text-muted f-12 mb-1">{label}</Form.Label>
                    <div className="fw-semibold">{value || '-'}</div>
                  </Col>
                ))}
              </Row>

              <div>
                <Form.Label className="text-muted f-12 mb-1">Description</Form.Label>
                <div className="border rounded p-3 bg-light" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {selectedTask.description}
                </div>
              </div>
            </Stack>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {selectedTask?.url ? (
            <Button as="a" href={selectedTask.url} target="_blank" rel="noreferrer" variant="outline-primary">
              Open in ClickUp <i className="ti ti-external-link ms-1" />
            </Button>
          ) : null}
          <Button variant="light-secondary" onClick={() => setSelectedTask(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </MainCard>
  );
}
