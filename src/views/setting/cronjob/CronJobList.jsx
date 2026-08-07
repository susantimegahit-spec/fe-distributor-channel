import React, { useEffect, useState } from 'react';

// react-bootstrap
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup';
import Overlay from 'react-bootstrap/Overlay';

// project-imports
import MainCard from 'components/MainCard';
import { useAlert } from '../../../utils/alertContext';
import CronJobServices from '../../../services/setting/CronJobServices';

const initialCreateForm = {
  name: '',
  command: '',
  expression: '',
  is_active: true,
  description: ''
};

const actionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }
  ]
};

export default function CronJobList() {
  const { showAlert } = useAlert();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createLoading, setCreateLoading] = useState(false);

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewJob, setViewJob] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editForm, setEditForm] = useState(initialCreateForm);
  const [editLoading, setEditLoading] = useState(false);

  // Logs Modal State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logJobName, setLogJobName] = useState('');

  // Fetch all jobs
  const fetchJobs = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const response = await CronJobServices.getCronJobs();
      if (response.data && response.data.success) {
        setJobs(response.data.data);
      } else {
        showAlert(response.data?.message || 'Failed to load cron job list', 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert('Server connection error occurred', 'danger');
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateLoading(true);

    try {
      const response = await CronJobServices.postCronJobs(createForm);
      if (response.data && response.data.success) {
        showAlert(`Cron job ${createForm.name} created successfully.`, 'success');
        setShowCreateModal(false);
        setCreateForm(initialCreateForm);
        fetchJobs(false);
      } else {
        showAlert(response.data?.message || 'Failed to create cron job.', 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert(error?.response?.data?.message || 'Failed to contact server', 'danger');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle run manually
  const handleRunJob = async (job) => {
    setRunningJobId(job.id);
    showAlert(`Starting task execution: ${job.name}`, 'info');
    try {
      const response = await CronJobServices.runCronJob(job.id);
      if (response.data && response.data.success) {
        showAlert(`Task ${job.name} ran successfully.`, 'success');
        fetchJobs(false); // Refresh list silently
      } else {
        showAlert(response.data?.message || `Failed to run task ${job.name}`, 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert(`Failed to execute task ${job.name}`, 'danger');
    } finally {
      setRunningJobId(null);
    }
  };

  // Handle active status toggle
  const handleToggleActive = async (job) => {
    try {
      const updatedData = {
        name: job.name,
        command: job.command,
        expression: job.expression,
        is_active: !job.is_active,
        description: job.description
      };
      const response = await CronJobServices.updateCronJob(job.id, updatedData);
      if (response.data && response.data.success) {
        showAlert(`Task ${job.name} status updated successfully.`, 'success');
        fetchJobs(false);
      } else {
        showAlert(response.data?.message || 'Failed to update task status', 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert('Failed to contact server', 'danger');
    }
  };

  // Open Edit Modal
  const openEditModal = (job) => {
    setSelectedJob(job);
    setEditForm({
      name: job.name || '',
      command: job.command || '',
      expression: job.expression,
      is_active: job.is_active,
      description: job.description || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = (job) => {
    setViewJob(job);
    setShowViewModal(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await CronJobServices.updateCronJob(selectedJob.id, editForm);
      if (response.data && response.data.success) {
        showAlert(`Cron job ${editForm.name} updated successfully.`, 'success');
        setShowEditModal(false);
        fetchJobs(false);
      } else {
        showAlert(response.data?.message || 'Failed to save changes.', 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert(error?.response?.data?.message || 'Failed to contact server', 'danger');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Logs Modal
  const openLogsModal = async (job) => {
    setLogJobName(job.name);
    setShowLogsModal(true);
    setLogsLoading(true);
    setLogs([]);
    try {
      const response = await CronJobServices.getCronJobLogs(job.id);
      if (response.data && response.data.success) {
        setLogs(response.data.data);
      } else {
        showAlert('Failed to fetch logs.', 'danger');
      }
    } catch (error) {
      console.error(error);
      showAlert('Failed to contact server to load logs.', 'danger');
    } finally {
      setLogsLoading(false);
    }
  };

  // Helper for Last Run Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge bg="success">Success</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      case 'running':
        return <Badge bg="warning">Running</Badge>;
      default:
        return <Badge bg="secondary">Never</Badge>;
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <>
      <MainCard
        title={
          <div className="d-flex w-100 flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className="mb-0">Cron Job Settings & Monitoring</h5>
              <span className="text-muted f-12">Manage automation schedules and monitor execution logs in real time.</span>
            </div>
            <div className="d-flex gap-2">
              <Button size="sm" onClick={openCreateModal}>
                <i className="ti ti-plus me-1" />
                Add Cron Job
              </Button>
              <Button variant="light" className="border text-primary" size="sm" onClick={() => fetchJobs(true)} disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : <i className="ti ti-refresh me-1" />}
                Refresh Data
              </Button>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Loading cron job configuration...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="ti ti-alarm-off f-30 d-block mb-2" />
            No cron job data registered yet.
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '25%' }}>Name & Description</th>
                  <th>Artisan Command</th>
                  <th>Schedule (Cron Expression)</th>
                  <th>Last Run</th>
                  <th>Last Status</th>
                  <th className="text-center">Active</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div className="fw-semibold text-dark">{job.name}</div>
                      <small className="text-muted text-wrap d-block mt-1">{job.description || '-'}</small>
                    </td>
                    <td>
                      <code>php artisan {job.command}</code>
                    </td>
                    <td>
                      <Badge bg="light" className="text-dark border font-monospace py-1.5 px-2">
                        {job.expression}
                      </Badge>
                    </td>
                    <td>
                      <small>{formatDate(job.last_run_at)}</small>
                    </td>
                    <td>{getStatusBadge(job.last_run_status)}</td>
                    <td className="text-center">
                      <Form.Check
                        type="switch"
                        id={`job-active-${job.id}`}
                        checked={job.is_active}
                        onChange={() => handleToggleActive(job)}
                      />
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant={String(actionMenu?.job?.id) === String(job.id) ? 'primary' : 'outline-primary'}
                        aria-label="Open cron job actions"
                        aria-expanded={String(actionMenu?.job?.id) === String(job.id)}
                        onClick={(event) =>
                          setActionMenu((current) =>
                            String(current?.job?.id) === String(job.id) ? null : { job, target: event.currentTarget }
                          )
                        }
                      >
                        <i className="ti ti-dots-vertical me-1" />
                        Actions
                        <i className="ti ti-chevron-down ms-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </MainCard>

      <Overlay
        show={Boolean(actionMenu)}
        target={actionMenu?.target}
        placement="top-end"
        container={typeof document !== 'undefined' ? document.body : null}
        containerPadding={8}
        popperConfig={actionPopperConfig}
        rootClose
        rootCloseEvent="mousedown"
        onHide={() => setActionMenu(null)}
      >
        {({ ref, style, placement }) => {
          const job = actionMenu?.job;
          const isRunning = String(runningJobId) === String(job?.id);

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 180 }}
            >
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setActionMenu(null);
                  if (job) openViewModal(job);
                }}
              >
                <i className="ti ti-eye text-info me-2" />
                View
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setActionMenu(null);
                  if (job) openLogsModal(job);
                }}
              >
                <i className="ti ti-file-text text-secondary me-2" />
                Log History
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setActionMenu(null);
                  if (job) openEditModal(job);
                }}
              >
                <i className="ti ti-edit text-primary me-2" />
                Edit
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-success"
                disabled={isRunning}
                onClick={() => {
                  setActionMenu(null);
                  if (job) handleRunJob(job);
                }}
              >
                <i className={isRunning ? 'ti ti-loader-2 me-2' : 'ti ti-player-play me-2'} />
                {isRunning ? 'Running...' : 'Run Now'}
              </button>
            </div>
          );
        }}
      </Overlay>

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => !createLoading && setShowCreateModal(false)} centered>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Header closeButton={!createLoading}>
            <Modal.Title>Add Cron Job</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="createCronName">
              <Form.Label className="fw-semibold">Name</Form.Label>
              <Form.Control
                required
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                placeholder="Sync Master Products"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="createCronCommand">
              <Form.Label className="fw-semibold">Artisan Command</Form.Label>
              <InputGroup>
                <InputGroup.Text>php artisan</InputGroup.Text>
                <Form.Control
                  required
                  value={createForm.command}
                  onChange={(event) => setCreateForm({ ...createForm, command: event.target.value })}
                  placeholder="sync:master-products"
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="createCronExpression">
              <Form.Label className="fw-semibold">Cron Expression</Form.Label>
              <Form.Control
                required
                className="font-monospace"
                value={createForm.expression}
                onChange={(event) => setCreateForm({ ...createForm, expression: event.target.value })}
                placeholder="0 0 * * *"
              />
              <Form.Text className="text-muted">
                Example: <code>0 0 * * *</code> runs the command every day at midnight.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="createCronDescription">
              <Form.Label className="fw-semibold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={createForm.description}
                onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
                placeholder="Describe this automated task"
              />
            </Form.Group>

            <Form.Group controlId="createCronActive">
              <Form.Check
                type="switch"
                label="Activate this cron job"
                checked={createForm.is_active}
                onChange={(event) => setCreateForm({ ...createForm, is_active: event.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowCreateModal(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Cron Job'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cron Job Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={12}>
              <small className="text-muted d-block">Name</small>
              <div className="fw-semibold">{viewJob?.name || '-'}</div>
            </Col>
            <Col xs={12}>
              <small className="text-muted d-block">Artisan Command</small>
              <code className="d-inline-block border rounded bg-light px-2 py-1 mt-1">php artisan {viewJob?.command || '-'}</code>
            </Col>
            <Col sm={6}>
              <small className="text-muted d-block">Cron Expression</small>
              <Badge bg="light" className="text-dark border font-monospace mt-1">
                {viewJob?.expression || '-'}
              </Badge>
            </Col>
            <Col sm={6}>
              <small className="text-muted d-block">Active Status</small>
              <Badge bg={viewJob?.is_active ? 'success' : 'secondary'} className="mt-1">
                {viewJob?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Col>
            <Col sm={6}>
              <small className="text-muted d-block">Last Run</small>
              <div>{formatDate(viewJob?.last_run_at)}</div>
            </Col>
            <Col sm={6}>
              <small className="text-muted d-block">Last Status</small>
              <div className="mt-1">{getStatusBadge(viewJob?.last_run_status)}</div>
            </Col>
            <Col xs={12}>
              <small className="text-muted d-block">Description</small>
              <div className="rounded border bg-light p-3 mt-1">{viewJob?.description || '-'}</div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              setShowViewModal(false);
              openEditModal(viewJob);
            }}
          >
            <i className="ti ti-edit me-1" />
            Edit Cron Job
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => !editLoading && setShowEditModal(false)} centered>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Header closeButton={!editLoading}>
            <Modal.Title>Edit Scheduler: {selectedJob?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="editCronName">
              <Form.Label className="fw-semibold">Name</Form.Label>
              <Form.Control
                required
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                placeholder="Sync Master Products"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="editCronCommand">
              <Form.Label className="fw-semibold">Artisan Command</Form.Label>
              <InputGroup>
                <InputGroup.Text>php artisan</InputGroup.Text>
                <Form.Control
                  required
                  value={editForm.command}
                  onChange={(event) => setEditForm({ ...editForm, command: event.target.value })}
                  placeholder="sync:master-products"
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formExpression">
              <Form.Label className="fw-semibold">Cron Expression (Format: Minute Hour Day Month Day-of-Week)</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="*/15 * * * *"
                  required
                  value={editForm.expression}
                  onChange={(e) => setEditForm({ ...editForm, expression: e.target.value })}
                />
              </InputGroup>
              <Form.Text className="text-muted">
                Example: <code>* * * * *</code> (Every Minute), <code>*/15 * * * *</code> (Every 15 Minutes),{' '}
                <code>0 0 * * *</code> (Midnight).
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formDescription">
              <Form.Label className="fw-semibold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe this automated task"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formActive">
              <Form.Check
                type="switch"
                label="Activate this cron job"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="danger" onClick={() => setShowEditModal(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={editLoading}>
              {editLoading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Logs / Monitoring Modal */}
      <Modal show={showLogsModal} onHide={() => setShowLogsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Log History: {logJobName}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {logsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="text-muted mt-2">Loading log history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-muted">No log history for this task yet.</div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm">
                <thead>
                  <tr>
                    <th>Waktu Mulai</th>
                    <th>Durasi</th>
                    <th>Status</th>
                    <th>Hasil / Output Log</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.run_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {log.duration_seconds !== null ? `${log.duration_seconds} seconds` : '-'}
                      </td>
                      <td>
                        {log.status === 'success' ? (
                          <Badge bg="success">Success</Badge>
                        ) : log.status === 'failed' ? (
                          <Badge bg="danger">Failed</Badge>
                        ) : (
                          <Badge bg="warning">Running</Badge>
                        )}
                      </td>
                      <td>
                        <pre className="m-0 bg-light p-2 border rounded text-wrap f-11 font-monospace" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {log.message || 'No log output'}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
