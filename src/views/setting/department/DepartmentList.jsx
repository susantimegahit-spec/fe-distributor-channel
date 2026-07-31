import { useCallback, useEffect, useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import DistributorServices from '../../../services/customer-portal/DistributorServices';
import { useAlert } from '../../../utils/alertContext';

const PAGE_SIZE = 10;
const DEPARTMENT_OCR_TYPE = 3;

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
};

const normalizeDepartment = (department, index) => ({
  id: department?.id ?? department?.ocr_code ?? `department-${index}`,
  code: department?.ocr_code ?? department?.ocrCode ?? department?.OcrCode ?? department?.code ?? '',
  name: department?.ocr_name ?? department?.ocrName ?? department?.OcrName ?? department?.name ?? '',
  status: department?.status ?? department?.is_active ?? 1
});

export default function DepartmentList() {
  const { showAlert } = useAlert();
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDepartments = useCallback(
    async (showLoadingIndicator = true) => {
      if (showLoadingIndicator) setLoading(true);

      try {
        const response = await DistributorServices.getOcrByType(DEPARTMENT_OCR_TYPE);
        const departmentList = getResponseList(response).map(normalizeDepartment);
        setDepartments(departmentList);
      } catch (error) {
        setDepartments([]);
        showAlert(error?.response?.data?.message || 'Failed to load department data', 'danger');
      } finally {
        if (showLoadingIndicator) setLoading(false);
      }
    },
    [showAlert]
  );

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSync = async () => {
    setSyncing(true);

    try {
      const response = await DistributorServices.getSyncOcr(DEPARTMENT_OCR_TYPE);
      showAlert(response?.data?.message || 'Department data synchronized successfully', 'success');
      await fetchDepartments(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || 'Failed to synchronize department data', 'danger');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredDepartments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return departments;

    return departments.filter(
      (department) => department.code.toLowerCase().includes(keyword) || department.name.toLowerCase().includes(keyword)
    );
  }, [departments, search]);

  const pageCount = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredDepartments]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  return (
    <MainCard
      title={
        <Stack direction="horizontal" gap={3} className="justify-content-between flex-wrap">
          <div>
            <h5 className="mb-0">Departments</h5>
            <span className="text-muted f-12">Department master data from OCR type 3.</span>
          </div>
          <Stack direction="horizontal" gap={2}>
            <Button variant="outline-primary" size="sm" onClick={() => fetchDepartments()} disabled={loading || syncing}>
              {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ti ti-refresh me-1" />}
              Refresh Data
            </Button>
            <Button variant="primary" size="sm" onClick={handleSync} disabled={loading || syncing}>
              {syncing ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="ti ti-cloud-download me-1" />}
              Sync Department
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
          placeholder="Search department code or name..."
          aria-label="Search departments"
        />
        {search && (
          <Button variant="outline-secondary" onClick={() => setSearch('')} aria-label="Clear department search">
            <i className="ti ti-x" />
          </Button>
        )}
      </InputGroup>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2 mb-0">Loading department data...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="ti ti-building-off f-30 d-block mb-2" />
          {search ? 'No departments match your search.' : 'No department data is available.'}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>No.</th>
                  <th style={{ width: '30%' }}>Department Code</th>
                  <th>Department Name</th>
                  <th className="text-center" style={{ width: 120 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedDepartments.map((department, index) => (
                  <tr key={department.id}>
                    <td className="text-muted">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <span className="fw-semibold">{department.code || '-'}</span>
                    </td>
                    <td>{department.name || '-'}</td>
                    <td className="text-center">
                      <Badge bg={Number(department.status) === 0 ? 'secondary' : 'success'}>
                        {Number(department.status) === 0 ? 'Inactive' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={PAGE_SIZE}
            total={filteredDepartments.length}
            itemLabel="departments"
          />
        </>
      )}
    </MainCard>
  );
}
