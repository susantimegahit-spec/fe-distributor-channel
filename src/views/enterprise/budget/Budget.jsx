import { useCallback, useEffect, useMemo, useState } from 'react';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Select from 'react-select';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import BudgetingServices from '../../../services/enterprise/BudgetingServices';
import { useAlert } from '../../../utils/alertContext';

const PAGE_SIZE = 10;
const currentYear = new Date().getFullYear();
const initialForm = {
  department: '',
  budget_amount: '',
  period_year: currentYear,
  status: 'ACTIVE',
  description: ''
};

const actionPopperConfig = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }
  ]
};

const getBudgetList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.budgets)) return payload.budgets;
  return [];
};

const getDepartmentList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeDepartment = (item) => ({
  value: String(item?.ocr_code ?? item?.ocrCode ?? item?.OcrCode ?? item?.code ?? ''),
  label: String(item?.ocr_name ?? item?.ocrName ?? item?.OcrName ?? item?.name ?? '')
});

const normalizeBudget = (budget, index) => ({
  ...budget,
  id: budget?.id ?? budget?.budget_id ?? `budget-${index}`,
  department: budget?.department ?? budget?.department_code ?? '',
  budget_amount: Number(budget?.budget_amount ?? budget?.amount ?? 0),
  period_year: budget?.period_year ?? budget?.periode_year ?? budget?.year ?? '',
  status: String(budget?.status ?? 'ACTIVE').toUpperCase(),
  description: budget?.description ?? ''
});

const currency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
};

export default function Budget() {
  const { showAlert } = useAlert();
  const [budgets, setBudgets] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [periodYear, setPeriodYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  const fetchBudgets = useCallback(
    async (showLoadingIndicator = true) => {
      if (showLoadingIndicator) setLoading(true);
      try {
        const response = await BudgetingServices.getBudget(department, periodYear, search.trim());
        if (response?.data?.success === false) {
          throw new Error(response.data.message || 'Failed to load budget data');
        }
        setBudgets(getBudgetList(response).map(normalizeBudget));
        setCurrentPage(1);
      } catch (error) {
        setBudgets([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to load budget data', 'danger');
      } finally {
        if (showLoadingIndicator) setLoading(false);
      }
    },
    [department, periodYear, search, showAlert]
  );

  const fetchDepartments = useCallback(async () => {
    setLoadingDepartments(true);
    try {
      const response = await DistributorServices.getOcrByType(3);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to load department master data');
      }
      setDepartmentOptions(getDepartmentList(response).map(normalizeDepartment).filter((option) => option.value));
    } catch (error) {
      setDepartmentOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load department master data', 'danger');
    } finally {
      setLoadingDepartments(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchBudgets();
    fetchDepartments();
    // Initial request only; subsequent filters are applied through Search/Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingBudget(null);
    setForm({ ...initialForm, period_year: periodYear || currentYear, department });
    setShowForm(true);
  };

  const openEditForm = (budget) => {
    setEditingBudget(budget);
    setForm({
      department: budget.department,
      budget_amount: budget.budget_amount,
      period_year: budget.period_year,
      status: budget.status,
      description: budget.description
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.department) {
      showAlert('Department is required', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      department: form.department.trim(),
      budget_amount: Number(form.budget_amount),
      period_year: Number(form.period_year),
      status: form.status,
      description: form.description.trim()
    };

    try {
      const response = editingBudget
        ? await BudgetingServices.putBudget(editingBudget.id, payload)
        : await BudgetingServices.postBudget(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to save budget');
      }
      showAlert(response?.data?.message || `Budget ${editingBudget ? 'updated' : 'created'} successfully`, 'success');
      setShowForm(false);
      setEditingBudget(null);
      setForm(initialForm);
      await fetchBudgets(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to save budget', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!budgetToDelete) return;
    setDeleting(true);
    try {
      const response = await BudgetingServices.deleteBudget(budgetToDelete.id);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to delete budget');
      }
      showAlert(response?.data?.message || 'Budget deleted successfully', 'success');
      setBudgetToDelete(null);
      await fetchBudgets(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to delete budget', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(budgets.length / PAGE_SIZE));
  const paginatedBudgets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return budgets.slice(start, start + PAGE_SIZE);
  }, [budgets, currentPage]);
  const totalBudget = useMemo(() => budgets.reduce((total, budget) => total + budget.budget_amount, 0), [budgets]);
  const activeBudgets = useMemo(() => budgets.filter((budget) => budget.status === 'ACTIVE').length, [budgets]);

  return (
    <>
      <MainCard
        title={
          <Stack direction="horizontal" gap={3} className="flex-wrap justify-content-between w-100">
            <div>
              <h5 className="mb-0">Budget</h5>
              <span className="text-muted f-12">Manage departmental corporate budgets by fiscal year.</span>
            </div>
            <Button size="sm" onClick={openCreateForm}>
              <i className="ti ti-plus me-1" /> New Budget
            </Button>
          </Stack>
        }
      >
        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="border h-100 mb-0"><Card.Body><small className="text-muted">Total Budget</small><h4 className="mb-0 mt-1">{currency(totalBudget)}</h4></Card.Body></Card>
          </Col>
          <Col md={4}>
            <Card className="border h-100 mb-0"><Card.Body><small className="text-muted">Budget Records</small><h4 className="mb-0 mt-1">{budgets.length}</h4></Card.Body></Card>
          </Col>
          <Col md={4}>
            <Card className="border h-100 mb-0"><Card.Body><small className="text-muted">Active Budgets</small><h4 className="mb-0 mt-1 text-success">{activeBudgets}</h4></Card.Body></Card>
          </Col>
        </Row>

        <Card className="border mb-0">
          <Card.Header className="bg-transparent">
            <Row className="g-2 align-items-end">
              <Col lg={4}>
                <Form.Label className="f-12 text-muted">Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text><i className="ti ti-search" /></InputGroup.Text>
                  <Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search budget..." onKeyDown={(event) => event.key === 'Enter' && fetchBudgets()} />
                </InputGroup>
              </Col>
              <Col lg={3}>
                <Form.Label className="f-12 text-muted">Department</Form.Label>
                <Select
                  value={departmentOptions.find((option) => option.value === department) || null}
                  options={departmentOptions}
                  onChange={(option) => setDepartment(option?.value || '')}
                  placeholder={loadingDepartments ? 'Loading departments...' : 'All Departments'}
                  isLoading={loadingDepartments}
                  isDisabled={loadingDepartments}
                  isClearable
                  isSearchable
                  menuPosition="fixed"
                  formatOptionLabel={(option) => `${option.value} - ${option.label}`}
                  noOptionsMessage={() => 'No department found'}
                />
              </Col>
              <Col lg={2}>
                <Form.Label className="f-12 text-muted">Period Year</Form.Label>
                <Form.Control type="number" value={periodYear} onChange={(event) => setPeriodYear(event.target.value)} placeholder="2026" />
              </Col>
              <Col lg={3}>
                <Stack direction="horizontal" gap={2} className="justify-content-lg-end">
                  <Button variant="primary" onClick={() => fetchBudgets()} disabled={loading}>Search</Button>
                  <Button variant="outline-primary" onClick={() => fetchBudgets()} disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : <i className="ti ti-refresh" />} <span className="ms-1">Refresh</span>
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Header>

          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="text-muted mt-2 mb-0">Loading budget data...</p></div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="ti ti-wallet-off f-30 d-block mb-2" />No budget data available.</div>
          ) : (
            <Card.Body>
              <div className="table-responsive">
                <Table hover align="middle" className="mb-0">
                  <thead className="table-light"><tr><th>No.</th><th>Department</th><th>Budget Amount</th><th>Period Year</th><th>Status</th><th>Description</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {paginatedBudgets.map((budget, index) => (
                      <tr key={budget.id}>
                        <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="fw-semibold">{budget.department || '-'}</td>
                        <td>{currency(budget.budget_amount)}</td>
                        <td>{budget.period_year || '-'}</td>
                        <td><Badge bg={budget.status === 'ACTIVE' ? 'success' : 'secondary'}>{budget.status}</Badge></td>
                        <td>{budget.description || '-'}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant={String(actionMenu?.budget?.id) === String(budget.id) ? 'primary' : 'outline-primary'}
                            aria-label="Open budget actions"
                            aria-expanded={String(actionMenu?.budget?.id) === String(budget.id)}
                            onClick={(event) =>
                              setActionMenu((current) =>
                                String(current?.budget?.id) === String(budget.id)
                                  ? null
                                  : { budget, target: event.currentTarget }
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
              <TablePagination currentPage={currentPage} onPageChange={setCurrentPage} pageCount={pageCount} pageSize={PAGE_SIZE} total={budgets.length} itemLabel="budgets" />
            </Card.Body>
          )}
        </Card>
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
          const budget = actionMenu?.budget;

          return (
            <div
              ref={ref}
              className="dropdown-menu show"
              data-popper-placement={placement}
              style={{ ...style, zIndex: 1080, minWidth: 170 }}
            >
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setActionMenu(null);
                  if (budget) openEditForm(budget);
                }}
              >
                <i className="ti ti-edit text-primary me-2" />
                Edit
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item text-danger"
                onClick={() => {
                  setActionMenu(null);
                  if (budget) setBudgetToDelete(budget);
                }}
              >
                <i className="ti ti-trash me-2" />
                Delete
              </button>
            </div>
          );
        }}
      </Overlay>

      <Modal show={showForm} onHide={() => !saving && setShowForm(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton={!saving}><Modal.Title>{editingBudget ? 'Edit Budget' : 'New Budget'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Select
                value={departmentOptions.find((option) => option.value === form.department) || null}
                options={departmentOptions}
                onChange={(option) => setForm({ ...form, department: option?.value || '' })}
                placeholder={loadingDepartments ? 'Loading departments...' : 'Select department'}
                isLoading={loadingDepartments}
                isDisabled={loadingDepartments}
                isClearable
                isSearchable
                menuPosition="fixed"
                formatOptionLabel={(option) => `${option.value} - ${option.label}`}
                noOptionsMessage={() => 'No department found'}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Budget Amount</Form.Label>
              <InputGroup>
                <InputGroup.Text>Rp</InputGroup.Text>
                <Form.Control
                  required
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(form.budget_amount)}
                  onChange={(event) => setForm({ ...form, budget_amount: event.target.value.replace(/\D/g, '') })}
                  placeholder="50.000.000"
                />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Period Year</Form.Label>
              <Form.Control required min="2000" type="number" value={form.period_year} onChange={(event) => setForm({ ...form, period_year: event.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Budget Operasional Q3" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Check
                className="system-theme-switch mb-0"
                type="switch"
                id="budget-status"
                label={form.status === 'ACTIVE' ? 'Active' : 'Not Active'}
                checked={form.status === 'ACTIVE'}
                onChange={(event) => setForm({ ...form, status: event.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                aria-label={`Budget status: ${form.status === 'ACTIVE' ? 'Active' : 'Not Active'}`}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer><Button variant="light-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Spinner animation="border" size="sm" /> : 'Save Budget'}</Button></Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(budgetToDelete)} onHide={() => !deleting && setBudgetToDelete(null)} centered size="sm">
        <Modal.Header closeButton={!deleting}><Modal.Title>Delete Budget</Modal.Title></Modal.Header>
        <Modal.Body>Delete budget for <strong>{budgetToDelete?.department}</strong> in {budgetToDelete?.period_year}?</Modal.Body>
        <Modal.Footer><Button variant="light-secondary" onClick={() => setBudgetToDelete(null)} disabled={deleting}>Cancel</Button><Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? <Spinner animation="border" size="sm" /> : 'Delete'}</Button></Modal.Footer>
      </Modal>
    </>
  );
}
