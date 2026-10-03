import { useCallback, useEffect, useMemo, useState } from 'react';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import Select from 'react-select';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import TaskManagementServices from '../../../services/corporate/TaskManagementServices';
import { useAlert } from '../../../utils/alertContext';

const PAGE_SIZE = 10;
const EMPTY_STAFF_FORM = {
  fullName: '',
  nik: '',
  emailOffice: '',
  phoneNumber: '',
  departmentCode: '',
  positionCode: '',
  employmentStatus: 'PERMANENT',
  joinDate: ''
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.employees)) return payload.employees;
  if (Array.isArray(payload?.departments)) return payload.departments;
  if (Array.isArray(payload?.positions)) return payload.positions;

  return [];
};

const normalizeStaff = (staff, index) => ({
  id: staff?.id ?? staff?.employee_id ?? staff?.employeeId ?? `staff-${index}`,
  code: String(staff?.employee_code ?? staff?.employeeCode ?? staff?.nik ?? staff?.code ?? '').trim(),
  name: String(staff?.employee_name ?? staff?.employeeName ?? staff?.full_name ?? staff?.fullName ?? staff?.name ?? '').trim(),
  email: String(staff?.employee_email ?? staff?.employeeEmail ?? staff?.email ?? staff?.user?.email ?? '').trim(),
  department: String(
    staff?.department_name ??
      staff?.departmentName ??
      staff?.department?.name ??
      staff?.department?.ocr_name ??
      staff?.department_code ??
      staff?.departmentCode ??
      '-'
  ).trim(),
  status: staff?.status ?? staff?.is_active ?? staff?.isActive ?? 1
});

const normalizeDepartment = (department, index) => {
  const code = String(
    department?.dept_code ??
      department?.ocr_code ??
      department?.ocrCode ??
      department?.department_code ??
      department?.departmentCode ??
      department?.code ??
      ''
  ).trim();
  const name = String(
    department?.dept_name ??
      department?.ocr_name ??
      department?.ocrName ??
      department?.department_name ??
      department?.departmentName ??
      department?.name ??
      ''
  ).trim();

  return {
    value: code,
    label: code && name ? `${code} — ${name}` : name || code,
    id: department?.id ?? department?.department_id ?? `department-${index}`,
    isActive: department?.is_active ?? department?.isActive ?? true
  };
};

const normalizePosition = (position, index) => {
  const code = String(
    position?.position_code ?? position?.positionCode ?? position?.code ?? position?.job_code ?? position?.jobCode ?? ''
  ).trim();
  const name = String(
    position?.position_name ?? position?.positionName ?? position?.name ?? position?.job_name ?? position?.jobName ?? ''
  ).trim();

  return {
    value: code,
    label: code && name ? `${code} — ${name}` : name || code,
    id: position?.id ?? position?.position_id ?? `position-${index}`,
    isActive: position?.is_active ?? position?.isActive ?? true
  };
};

const isActiveStaff = (status) => ![0, false, '0', 'inactive', 'INACTIVE'].includes(status);

export default function StaffList() {
  const { showAlert } = useAlert();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [positionOptions, setPositionOptions] = useState([]);
  const [positionLoading, setPositionLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setLoading(true);

    try {
      const response = await TaskManagementServices.getStaff();
      setStaff(getResponseList(response).map(normalizeStaff));
    } catch (error) {
      setStaff([]);
      showAlert(error?.response?.data?.message || 'Failed to load staff data', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    let active = true;
    setDepartmentLoading(true);
    TaskManagementServices.getDepartments()
      .then((response) => {
        if (!active) return;
        const options = getResponseList(response)
          .map(normalizeDepartment)
          .filter((department) => department.value && department.label && department.isActive);
        setDepartmentOptions(options);
      })
      .catch((error) => {
        if (!active) return;
        setDepartmentOptions([]);
        showAlert(error?.response?.data?.message || 'Failed to load department data', 'danger');
      })
      .finally(() => {
        if (active) setDepartmentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showAlert]);

  useEffect(() => {
    let active = true;
    setPositionLoading(true);
    TaskManagementServices.getStaffPositions()
      .then((response) => {
        if (!active) return;
        const options = getResponseList(response)
          .map(normalizePosition)
          .filter((position) => position.value && position.label && position.isActive);
        setPositionOptions(options);
      })
      .catch((error) => {
        if (!active) return;
        setPositionOptions([]);
        showAlert(error?.response?.data?.message || 'Failed to load position data', 'danger');
      })
      .finally(() => {
        if (active) setPositionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showAlert]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredStaff = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return staff;

    return staff.filter((item) =>
      [item.code, item.name, item.email, item.department].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [search, staff]);

  const pageCount = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredStaff]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const updateStaffForm = (field, value) => {
    setStaffForm((current) => ({ ...current, [field]: value }));
  };

  const openAddStaff = () => {
    setStaffForm(EMPTY_STAFF_FORM);
    setShowAddStaff(true);
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    if (savingStaff) return;
    if (!staffForm.departmentCode) {
      showAlert('Please select a department', 'warning');
      return;
    }
    if (!staffForm.positionCode) {
      showAlert('Please select a position', 'warning');
      return;
    }

    setSavingStaff(true);
    try {
      const response = await TaskManagementServices.addStaff({
        full_name: staffForm.fullName.trim(),
        nik: staffForm.nik.trim(),
        email_office: staffForm.emailOffice.trim(),
        phone_number: staffForm.phoneNumber.trim(),
        dept_code: staffForm.departmentCode.trim(),
        position_code: staffForm.positionCode.trim(),
        employment_status: staffForm.employmentStatus,
        join_date: staffForm.joinDate
      });
      setShowAddStaff(false);
      setStaffForm(EMPTY_STAFF_FORM);
      showAlert(response?.data?.message || 'Staff added successfully', 'success');
      await fetchStaff();
    } catch (error) {
      showAlert(error?.response?.data?.message || 'Failed to add staff', 'danger');
    } finally {
      setSavingStaff(false);
    }
  };

  return (
    <MainCard
      headerClassName="role-permission-header"
      title={
        <Stack direction="horizontal" gap={3} className="justify-content-between flex-wrap">
          <div>
            <h5 className="mb-0">Staff</h5>
            <span className="text-muted f-12">Corporate staff master data from Task Management.</span>
          </div>
          <Stack direction="horizontal" gap={2}>
            <Button variant="outline-primary" size="sm" onClick={fetchStaff} disabled={loading || savingStaff}>
              {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ti ti-refresh me-1" />}
              Refresh Data
            </Button>
            <Button variant="primary" size="sm" onClick={openAddStaff} disabled={savingStaff}>
              <i className="ti ti-user-plus me-1" />
              Add Staff
            </Button>
          </Stack>
        </Stack>
      }
    >
      <InputGroup className="mb-3" style={{ maxWidth: 420 }}>
        <InputGroup.Text>
          <i className="ti ti-search" />
        </InputGroup.Text>
        <Form.Control
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search staff name, code, email, or department..."
          aria-label="Search staff"
        />
        {search ? (
          <Button variant="outline-secondary" onClick={() => setSearch('')} aria-label="Clear staff search">
            <i className="ti ti-x" />
          </Button>
        ) : null}
      </InputGroup>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2 mb-0">Loading staff data...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="ti ti-user-off f-30 d-block mb-2" />
          {search ? 'No staff match your search.' : 'No staff data is available.'}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>No.</th>
                  <th style={{ width: '18%' }}>Staff Code</th>
                  <th>Staff Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th className="text-center" style={{ width: 110 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((item, index) => {
                  const active = isActiveStaff(item.status);
                  return (
                    <tr key={item.id}>
                      <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="fw-semibold">{item.code || '-'}</td>
                      <td>{item.name || '-'}</td>
                      <td>{item.email || '-'}</td>
                      <td>{item.department || '-'}</td>
                      <td className="text-center">
                        <Badge bg={active ? 'success' : 'secondary'}>{active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={PAGE_SIZE}
            total={filteredStaff.length}
            itemLabel="staff"
          />
        </>
      )}

      <Modal show={showAddStaff} onHide={() => !savingStaff && setShowAddStaff(false)} centered size="lg">
        <Form onSubmit={submitStaff}>
          <Modal.Header closeButton={!savingStaff}>
            <Modal.Title>Add Staff</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Full Name *</Form.Label>
                <Form.Control
                  autoFocus
                  required
                  maxLength={150}
                  value={staffForm.fullName}
                  onChange={(event) => updateStaffForm('fullName', event.target.value)}
                  placeholder="Siti Rahmawati"
                />
              </Col>
              <Col md={6}>
                <Form.Label>NIK *</Form.Label>
                <Form.Control
                  required
                  maxLength={50}
                  value={staffForm.nik}
                  onChange={(event) => updateStaffForm('nik', event.target.value)}
                  placeholder="EMP-2026-0042"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Office Email *</Form.Label>
                <Form.Control
                  type="email"
                  required
                  maxLength={150}
                  value={staffForm.emailOffice}
                  onChange={(event) => updateStaffForm('emailOffice', event.target.value)}
                  placeholder="name@company.com"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Phone Number *</Form.Label>
                <Form.Control
                  type="tel"
                  required
                  maxLength={30}
                  value={staffForm.phoneNumber}
                  onChange={(event) => updateStaffForm('phoneNumber', event.target.value)}
                  placeholder="081234567890"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Department *</Form.Label>
                <Select
                  classNamePrefix="staff-department-select"
                  inputId="staff-department"
                  aria-label="Department"
                  options={departmentOptions}
                  value={departmentOptions.find((department) => department.value === staffForm.departmentCode) || null}
                  onChange={(option) => updateStaffForm('departmentCode', option?.value || '')}
                  isLoading={departmentLoading}
                  isDisabled={departmentLoading || savingStaff}
                  isClearable
                  placeholder="Select Department..."
                  noOptionsMessage={() => (departmentLoading ? 'Loading departments...' : 'No departments available')}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Position *</Form.Label>
                <Select
                  classNamePrefix="staff-position-select"
                  inputId="staff-position"
                  aria-label="Position"
                  options={positionOptions}
                  value={positionOptions.find((position) => position.value === staffForm.positionCode) || null}
                  onChange={(option) => updateStaffForm('positionCode', option?.value || '')}
                  isLoading={positionLoading}
                  isDisabled={positionLoading || savingStaff}
                  isClearable
                  placeholder="Select Position..."
                  noOptionsMessage={() => (positionLoading ? 'Loading positions...' : 'No positions available')}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 1100 }) }}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Employment Status *</Form.Label>
                <Form.Select
                  required
                  value={staffForm.employmentStatus}
                  onChange={(event) => updateStaffForm('employmentStatus', event.target.value)}
                >
                  <option value="PERMANENT">Permanent</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="PROBATION">Probation</option>
                  <option value="INTERN">Intern</option>
                  <option value="OUTSOURCE">Outsource</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Join Date *</Form.Label>
                <Form.Control
                  type="date"
                  required
                  value={staffForm.joinDate}
                  onChange={(event) => updateStaffForm('joinDate', event.target.value)}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light-secondary" disabled={savingStaff} onClick={() => setShowAddStaff(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingStaff}>
              {savingStaff ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-user-plus me-1" />}
              {savingStaff ? 'Saving...' : 'Add Staff'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainCard>
  );
}
