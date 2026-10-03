import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Collapse from 'react-bootstrap/Collapse';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import TaskManagementServices from '../../../services/corporate/TaskManagementServices';
import { useAlert } from '../../../utils/alertContext';
import './team-task-summary.scss';

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 34, fontSize: '0.75rem' }),
  option: (base) => ({ ...base, fontSize: '0.75rem' })
};
const createFilters = () => ({
  space_id: '',
  department_id: '',
  employee_id: '',
  search: '',
  include_tasks: true,
  date_from: '',
  date_to: ''
});
const responseList = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of [...keys, 'data', 'items', 'rows', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.[key]?.data)) return payload[key].data;
    if (Array.isArray(payload?.[key]?.items)) return payload[key].items;
  }
  return [];
};
const text = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim());
  return value === undefined ? '' : String(value).trim();
};
const number = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== '');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const statusColor = (status, index) => {
  const normalized = String(status || '').toLowerCase();
  if (['done', 'completed', 'complete', 'closed'].some((value) => normalized.includes(value))) return '#58c642';
  if (normalized.includes('progress') || normalized.includes('doing')) return '#d946c7';
  if (normalized.includes('review')) return '#4f7df3';
  if (normalized.includes('ready') || normalized.includes('todo') || normalized.includes('to do')) return '#73cf4b';
  return ['#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444'][index % 4];
};
const normalizeStatusBreakdown = (item, tasks) => {
  const source = item?.status_breakdown || item?.statuses || item?.by_status || item?.summary?.status_breakdown;
  if (Array.isArray(source)) {
    return source.map((status, index) => ({
      name: text(status?.status_name, status?.name, status?.status, `Status ${index + 1}`),
      count: number(status?.task_count, status?.count, status?.total),
      color: text(status?.color, status?.color_hex) || statusColor(status?.status_name || status?.name, index)
    }));
  }
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([name, value], index) => ({
      name,
      count: number(value?.count, value?.total, value),
      color: text(value?.color, value?.color_hex) || statusColor(name, index)
    }));
  }

  const counts = new Map();
  tasks.forEach((task) => {
    const name = text(task?.status?.name, task?.status_name, task?.status, 'No Status');
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, count], index) => ({ name, count, color: statusColor(name, index) }));
};
const normalizeTeamMember = (item, index) => {
  const employee = item?.employee || item?.staff || item?.user || item;
  const summary = item?.summary || item?.stats || item?.statistics || item?.metrics || item?.progress || item;
  const tasks = Array.isArray(item?.tasks) ? item.tasks : Array.isArray(summary?.tasks) ? summary.tasks : [];
  const total = number(summary?.total_tasks, summary?.total, summary?.task_count, tasks.length);
  const completed = number(summary?.completed_tasks, summary?.completed, summary?.done_tasks, summary?.done);
  const inProgress = number(summary?.in_progress_tasks, summary?.in_progress, summary?.active_tasks);
  const overdue = number(summary?.overdue_tasks, summary?.overdue);
  const percentage = number(summary?.completion_percentage, summary?.completion_rate, summary?.progress_percentage, total ? (completed / total) * 100 : 0);

  return {
    id: employee?.id ?? employee?.employee_id ?? item?.employee_id ?? `staff-${index}`,
    name: text(employee?.full_name, employee?.employee_name, employee?.name, item?.employee_name, `Staff ${index + 1}`),
    code: text(employee?.nik, employee?.employee_code, employee?.code, item?.nik),
    position: text(employee?.position_name, employee?.position?.name, employee?.position_code, item?.position_name, '-'),
    department: text(employee?.department_name, employee?.department?.name, employee?.dept_name, item?.department_name, '-'),
    total,
    completed,
    inProgress,
    overdue,
    percentage: Math.min(100, Math.max(0, percentage)),
    tasks,
    statuses: normalizeStatusBreakdown(item, tasks)
  };
};
const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
const avatarGradients = [
  'linear-gradient(145deg, #facc15, #f59e0b)',
  'linear-gradient(145deg, #60a5fa, #2563eb)',
  'linear-gradient(145deg, #a78bfa, #7c3aed)',
  'linear-gradient(145deg, #34d399, #059669)',
  'linear-gradient(145deg, #fb7185, #e11d48)',
  'linear-gradient(145deg, #22d3ee, #0891b2)',
  'linear-gradient(145deg, #fb923c, #ea580c)',
  'linear-gradient(145deg, #f472b6, #db2777)'
];
const avatarGradient = (member) => {
  const identity = `${member.id}-${member.name}`;
  const index = [...identity].reduce((total, character) => total + character.charCodeAt(0), 0) % avatarGradients.length;
  return avatarGradients[index];
};

export default function TeamTaskSummary({ active }) {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState(createFilters);
  const [members, setMembers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const fetchSummary = useCallback(
    async (nextFilters) => {
      const query = nextFilters || filters;
      if (query.date_from && query.date_to && new Date(query.date_from) > new Date(query.date_to)) {
        showAlert('Date From cannot be after Date To', 'warning');
        return;
      }
      setLoading(true);
      try {
        const response = await TaskManagementServices.getTaskStaffSummary(query);
        if (response?.data?.success === false || response?.data?.status === 'error') {
          throw new Error(response?.data?.message || 'Failed to load staff progress');
        }
        setMembers(
          responseList(response, ['employees', 'staff', 'team', 'members', 'team_view', 'team_members', 'staff_summaries']).map(
            normalizeTeamMember
          )
        );
      } catch (error) {
        setMembers([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to load staff progress', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    if (!active) return;
    setMastersLoading(true);
    Promise.allSettled([
      TaskManagementServices.getSpaces({}),
      TaskManagementServices.getDepartments(),
      TaskManagementServices.getStaff()
    ])
      .then(([spaceResponse, departmentResponse, employeeResponse]) => {
        if (spaceResponse.status === 'fulfilled') setSpaces(responseList(spaceResponse.value, ['spaces']));
        if (departmentResponse.status === 'fulfilled') setDepartments(responseList(departmentResponse.value, ['departments']));
        if (employeeResponse.status === 'fulfilled') setEmployees(responseList(employeeResponse.value, ['employees', 'staff']));
      })
      .finally(() => setMastersLoading(false));
    fetchSummary(createFilters());
    // Reload whenever the Staff Progress tab becomes active. This also avoids
    // stale initialized state after Vite Fast Refresh during development.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const options = useMemo(
    () => ({
      spaces: spaces.map((item) => ({ value: item.id ?? item.space_id, label: text(item.space_name, item.name, item.title) })),
      departments: departments.map((item) => ({
        value: item.id ?? item.department_id,
        label: text(item.dept_name, item.department_name, item.ocr_name, item.name, item.dept_code)
      })),
      employees: employees.map((item) => ({
        value: item.id ?? item.employee_id,
        label: text(item.full_name, item.employee_name, item.name, item.nik)
      }))
    }),
    [departments, employees, spaces]
  );
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const resetFilters = () => {
    const defaults = createFilters();
    setFilters(defaults);
    fetchSummary(defaults);
  };
  const openMemberDetail = async (member) => {
    if (loadingDetailId !== null) return;
    setLoadingDetailId(member.id);
    try {
      const response = await TaskManagementServices.getDetailStatsTask(member.id, {
        space_id: filters.space_id,
        department_id: filters.department_id,
        include_tasks: true,
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      if (response?.data?.success === false || response?.data?.status === 'error') {
        throw new Error(response?.data?.message || 'Failed to load staff task detail');
      }
      const payload = response?.data?.data ?? response?.data ?? {};
      const detailSource = payload?.employee || payload?.staff ? payload : payload?.data || payload;
      const detail = normalizeTeamMember(detailSource, 0);
      setSelectedMember({
        ...member,
        ...detail,
        id: detail.id || member.id,
        name: detail.name || member.name,
        code: detail.code || member.code,
        position: detail.position !== '-' ? detail.position : member.position,
        department: detail.department !== '-' ? detail.department : member.department
      });
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load staff task detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <Stack gap={3}>
      <div className="team-view-heading">
        <h5>Team View</h5>
        <p>View everyone's tasks, track their goals, and visually manage their capacity.</p>
      </div>
      <Card className="border">
        <Card.Body className="p-3">
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              fetchSummary();
            }}
          >
            <Row className="g-2 align-items-end">
              <Col md={6} xl={3}>
                <Form.Label className="f-12 mb-1">Search Staff</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text><i className="ti ti-search" /></InputGroup.Text>
                  <Form.Control value={filters.search} placeholder="Name or NIK..." onChange={(event) => updateFilter('search', event.target.value)} />
                </InputGroup>
              </Col>
              {[
                ['space_id', 'Space', options.spaces],
                ['department_id', 'Department', options.departments],
                ['employee_id', 'Staff', options.employees]
              ].map(([field, label, fieldOptions]) => (
                <Col md={6} xl={3} key={field}>
                  <Form.Label className="f-12 mb-1">{label}</Form.Label>
                  <Select
                    styles={selectStyles}
                    options={fieldOptions}
                    value={fieldOptions.find((option) => String(option.value) === String(filters[field])) || null}
                    onChange={(option) => updateFilter(field, option?.value || '')}
                    isLoading={mastersLoading}
                    isClearable
                    placeholder={`All ${label}`}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                  />
                </Col>
              ))}
              <Col md={6} xl={3}>
                <Form.Label className="f-12 mb-1">Date From</Form.Label>
                <Form.Control size="sm" type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} />
              </Col>
              <Col md={6} xl={3}>
                <Form.Label className="f-12 mb-1">Date To</Form.Label>
                <Form.Control size="sm" type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} />
              </Col>
              <Col md={6} xl={3}>
                <Form.Check
                  type="switch"
                  id="include-team-tasks"
                  label="Include task details"
                  checked={filters.include_tasks}
                  onChange={(event) => updateFilter('include_tasks', event.target.checked)}
                  className="mb-1"
                />
              </Col>
              <Col md={6} xl={3}>
                <Stack direction="horizontal" gap={2}>
                  <Button type="submit" size="sm" className="flex-grow-1" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ti ti-search me-1" />}
                    Apply Filter
                  </Button>
                  <Button type="button" size="sm" variant="light-secondary" disabled={loading} onClick={resetFilters}>
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="text-muted mt-2">Loading staff progress...</p></div>
      ) : members.length ? (
        <Row className="team-progress-grid g-3">
          {members.map((member) => {
            const expanded = expandedIds.includes(String(member.id));
            return (
              <Col xs={12} md={4} key={member.id}>
                <Card
                  className="team-progress-card h-100"
                  role="button"
                  tabIndex={0}
                  data-permission-action="none"
                  aria-label={`View task statistics for ${member.name}`}
                  onClick={() => openMemberDetail(member)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openMemberDetail(member);
                    }
                  }}
                >
                  <Card.Body>
                    <div className="team-progress-top">
                      <div className="team-progress-main">
                        <div className="team-progress-identity">
                          <span className="team-progress-avatar" style={{ background: avatarGradient(member) }}>
                            {initials(member.name)}
                          </span>
                          <div className="min-w-0">
                            <h6>{member.name}</h6>
                            <small>{member.code || '-'} · {member.position}</small>
                          </div>
                        </div>
                        <div className="team-progress-counts">
                          <div><strong>{Math.max(0, member.total - member.completed)}</strong><span>Not done</span></div>
                          <div><strong>{member.completed}</strong><span>Done</span></div>
                        </div>
                      </div>
                      <div
                        className="team-progress-ring"
                        style={{ '--team-progress': `${member.percentage * 3.6}deg` }}
                        aria-label={`${member.percentage.toFixed(0)} percent complete`}
                      >
                        <span>
                          {String(loadingDetailId) === String(member.id) ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            `${member.percentage.toFixed(0)}%`
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="team-progress-status-bar" aria-label="Task distribution by status">
                      {member.statuses.map((status) => (
                        <span
                          key={status.name}
                          title={`${status.name}: ${status.count}`}
                          style={{
                            backgroundColor: status.color,
                            flexGrow: status.count,
                            display: status.count ? undefined : 'none'
                          }}
                        />
                      ))}
                      {!member.statuses.some((status) => status.count) ? <span className="is-empty" /> : null}
                    </div>

                    <div className="team-progress-status-list">
                      {member.statuses.length ? (
                        member.statuses.map((status) => (
                          <div className="team-progress-status-row" key={status.name}>
                            <i className="ti ti-chevron-right" />
                            <span className="team-progress-status-dot" style={{ backgroundColor: status.color }} />
                            <span>{status.name}</span>
                            <small>({status.count})</small>
                          </div>
                        ))
                      ) : (
                        <div className="team-progress-status-row is-empty">No task status data</div>
                      )}
                    </div>

                    {filters.include_tasks && member.tasks.length ? (
                      <>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0 text-decoration-none"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedIds((current) =>
                              current.includes(String(member.id))
                                ? current.filter((id) => id !== String(member.id))
                                : [...current, String(member.id)]
                            );
                          }}
                        >
                          {expanded ? 'Hide Tasks' : `View Tasks (${member.tasks.length})`} <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} />
                        </Button>
                        <Collapse in={expanded}>
                          <div>
                            {member.tasks.map((task, index) => (
                              <div className="border-top py-2 f-12" key={task.id ?? task.task_id ?? index}>
                                <div className="fw-semibold">{text(task.title, task.task_name, task.name, '-')}</div>
                                <span className="text-muted">{text(task.status?.name, task.status_name, task.status, 'No status')}</span>
                              </div>
                            ))}
                          </div>
                        </Collapse>
                      </>
                    ) : null}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div className="text-center text-muted py-5"><i className="ti ti-users-off f-30 d-block mb-2" />No staff progress data found.</div>
      )}

      <Offcanvas
        show={Boolean(selectedMember)}
        onHide={() => setSelectedMember(null)}
        placement="end"
        className="todo-detail-drawer team-detail-drawer"
      >
        {selectedMember ? (
          <>
            <Offcanvas.Header closeButton>
              <div className="flex-grow-1">
                <div className="task-code mb-1">{selectedMember.code || `EMP-${selectedMember.id}`}</div>
                <Offcanvas.Title>{selectedMember.name}</Offcanvas.Title>
                <div className="text-muted f-12 mt-1">
                  {selectedMember.position} · {selectedMember.department}
                </div>
              </div>
            </Offcanvas.Header>
            <Offcanvas.Body>
            <Stack gap={4}>
              <div className="team-detail-profile">
                <span className="team-progress-avatar" style={{ background: avatarGradient(selectedMember) }}>
                  {initials(selectedMember.name)}
                </span>
                <div className="flex-grow-1">
                  <span className="text-muted f-11 d-block">Completion Progress</span>
                  <strong className="f-20">{selectedMember.percentage.toFixed(0)}%</strong>
                </div>
                <div
                  className="team-progress-ring"
                  style={{ '--team-progress': `${selectedMember.percentage * 3.6}deg` }}
                >
                  <span>{selectedMember.percentage.toFixed(0)}%</span>
                </div>
              </div>
              <Row className="g-3">
                {[
                  ['Total Tasks', selectedMember.total, 'text-body'],
                  ['Not Done', Math.max(0, selectedMember.total - selectedMember.completed), 'text-warning'],
                  ['In Progress', selectedMember.inProgress, 'text-primary'],
                  ['Completed', selectedMember.completed, 'text-success'],
                  ['Overdue', selectedMember.overdue, 'text-danger'],
                  ['Completion', `${selectedMember.percentage.toFixed(0)}%`, 'text-success']
                ].map(([label, value, color]) => (
                  <Col xs={6} md={4} key={label}>
                    <div className="border rounded p-3 h-100">
                      <small className="text-muted d-block mb-1">{label}</small>
                      <strong className={`f-20 ${color}`}>{value}</strong>
                    </div>
                  </Col>
                ))}
              </Row>
              <div>
                <h6 className="mb-2">Tasks</h6>
                {selectedMember.tasks.length ? (
                  selectedMember.tasks.map((task, index) => (
                    <div className="border rounded p-3 mb-2" key={task.id ?? task.task_id ?? index}>
                      <div className="fw-semibold mb-1">{text(task.title, task.task_name, task.name, '-')}</div>
                      <Stack direction="horizontal" gap={2} className="text-muted f-12 flex-wrap">
                        <span>{text(task.status?.name, task.status_name, task.status, 'No status')}</span>
                        <span>•</span>
                        <span>{text(task.priority?.name, task.priority_name, task.priority, 'No priority')}</span>
                        {text(task.due_date, task.dueDate) ? <><span>•</span><span>Due {text(task.due_date, task.dueDate)}</span></> : null}
                      </Stack>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted border rounded py-4">No task details available.</div>
                )}
              </div>
            </Stack>
            </Offcanvas.Body>
          </>
        ) : null}
      </Offcanvas>
    </Stack>
  );
}
