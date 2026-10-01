import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TaskManagementServices from 'services/corporate/TaskManagementServices';
import WidgetShell from './WidgetShell';
import { getPayload } from './widgetUtils';
import './task-management-widget.scss';

const numberValue = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const percentage = (value) => `${numberValue(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
const assigneeNames = (task) =>
  (Array.isArray(task.assignees) ? task.assignees : [])
    .map((assignee) => (typeof assignee === 'string' ? assignee : assignee.full_name || assignee.name || assignee.employee_name))
    .filter(Boolean);
const initials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function TaskManagementWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [], completionRate: 0, urgentTasks: [] });

  useEffect(() => {
    let active = true;
    TaskManagementServices.getWidgetTask()
      .then((response) => {
        if (!active) return;
        const payload = getPayload(response);
        const overview = payload?.overview || {};
        setState({
          loading: false,
          error: '',
          completionRate: numberValue(overview.completion_rate),
          urgentTasks: Array.isArray(payload?.urgent_tasks) ? payload.urgent_tasks : [],
          metrics: [
            { label: 'Total Tasks', value: numberValue(overview.total_tasks) },
            { label: 'To Do', value: numberValue(overview.to_do) },
            { label: 'In Progress', value: numberValue(overview.in_progress) },
            { label: 'In Review', value: numberValue(overview.in_review) },
            { label: 'Done', value: numberValue(overview.done) },
            { label: 'Cancelled', value: numberValue(overview.cancelled) },
            { label: 'Overdue', value: numberValue(overview.overdue) },
            { label: 'Due Today', value: numberValue(overview.due_today) }
          ]
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          loading: false,
          error: error?.response?.data?.message || error?.message || 'Unable to load task summary.',
          metrics: [],
          completionRate: 0,
          urgentTasks: []
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Task Management"
      subtitle={`${percentage(state.completionRate)} completed`}
      icon="ti ti-list-check"
      color="primary"
      loading={state.loading}
      error={state.error}
      metrics={state.metrics}
      onOpen={() => navigate('/corporate/hrd/to-do-list')}
    >
      <div className="task-widget-urgent">
        <div className="task-widget-urgent__heading">
          <span>
            <i className="ti ti-alert-triangle me-1" />
            Urgent Tasks
          </span>
          <small>{state.urgentTasks.length} task</small>
        </div>
        {state.urgentTasks.length ? (
          <div className="task-widget-urgent__list">
            {state.urgentTasks.map((task) => {
              const taskId = String(task.id || task.task_code);
              const names = assigneeNames(task);
              return (
              <div
                className="task-widget-urgent__item"
                key={taskId}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/corporate/hrd/to-do-list')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate('/corporate/hrd/to-do-list');
                }}
              >
                <span className="task-widget-urgent__title" title={task.task_code || task.title}>
                  {task.title || 'Untitled task'}
                </span>
                <span className="task-widget-urgent__meta">
                  <span className="task-widget-urgent__meta-item">
                    <small>Assignee</small>
                    {names.length ? (
                      <span className="task-widget-urgent__avatars">
                        {names.slice(0, 3).map((name) => (
                          <span className="task-widget-urgent__avatar" key={name} title={name}>
                            {initials(name)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </span>
                  <span className="task-widget-urgent__meta-item">
                    <small>Status</small>
                    <span
                      className="task-widget-urgent__status"
                      style={{ borderColor: task.status_color || '#94a3b8', color: task.status_color || '#64748b' }}
                    >
                      {task.status_name || '-'}
                    </span>
                  </span>
                  <span className="task-widget-urgent__meta-item task-widget-urgent__due-date">
                    <small>Due Date</small>
                    <span className={task.is_overdue ? 'text-danger' : ''}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </span>
                </span>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="task-widget-urgent__empty">No urgent tasks.</div>
        )}
      </div>
    </WidgetShell>
  );
}
