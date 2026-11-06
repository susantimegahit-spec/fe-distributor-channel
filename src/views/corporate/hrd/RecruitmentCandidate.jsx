import { useEffect, useMemo, useState } from 'react';

import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import RecruitmentServices from '../../../services/corporate/RecruitmentServices';
import { useAlert } from '../../../utils/alertContext';

const statusOptions = [
  ['prescreen', 'Prescreen'],
  ['shortlist', 'Shortlist'],
  ['reject', 'Reject'],
  ['hr_interview', 'HR Interview'],
  ['user_interview', 'User Interview'],
  ['psikotes', 'Psikotes'],
  ['final_interview', 'Final Interview'],
  ['offering', 'Offering'],
  ['join', 'Join']
];

const statusVariants = {
  prescreen: 'secondary',
  shortlist: 'info',
  reject: 'danger',
  hr_interview: 'primary',
  user_interview: 'primary',
  psikotes: 'warning',
  final_interview: 'info',
  offering: 'success',
  join: 'success'
};

const getCandidatePayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const candidates = Array.isArray(payload) ? payload : payload?.data || payload?.candidates || [];
  return {
    candidates: Array.isArray(candidates) ? candidates : [],
    currentPage: Number(payload?.current_page ?? payload?.meta?.current_page ?? 1),
    lastPage: Number(payload?.last_page ?? payload?.meta?.last_page ?? 1),
    perPage: Number(payload?.per_page ?? payload?.meta?.per_page ?? 15),
    total: Number(payload?.total ?? payload?.meta?.total ?? candidates?.length ?? 0)
  };
};

const formatStatus = (value) => statusOptions.find(([status]) => status === value)?.[1] || String(value || '-').replaceAll('_', ' ');

export default function RecruitmentCandidate() {
  const { showAlert } = useAlert();
  const [filters, setFilters] = useState({ status: '', position_applied: '', search: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({ candidates: [], currentPage: 1, lastPage: 1, perPage: 15, total: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    RecruitmentServices.getListCandidate({
      status: filters.status,
      position_applied: filters.position_applied.trim(),
      search: debouncedSearch,
      page,
      per_page: 15
    })
      .then((response) => {
        if (response?.data?.success === false || response?.data?.status === 'error') {
          throw new Error(response?.data?.message || 'Failed to fetch candidate data');
        }
        if (active) setResult(getCandidatePayload(response));
      })
      .catch((error) => {
        if (!active) return;
        setResult({ candidates: [], currentPage: 1, lastPage: 1, perPage: 15, total: 0 });
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch candidate data', 'danger');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, filters.position_applied, filters.status, page, showAlert]);

  const rows = useMemo(
    () =>
      result.candidates.map((candidate, index) => ({
        ...candidate,
        rowKey: candidate.id || candidate.candidate_id || `${page}-${index}`,
        name: candidate.full_name || candidate.name || '-',
        email: candidate.email || '-',
        phone: candidate.phone || candidate.phone_number || '-',
        position: candidate.position_applied || '-',
        status: candidate.status || candidate.pipeline_status || 'prescreen'
      })),
    [page, result.candidates]
  );

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== 'search') setPage(1);
  };

  return (
    <MainCard title="Candidate" data-permission-action="view" data-permission-menu-key="enterprise-hrd-recruitment-candidate">
      <Card className="border mb-0">
        <Card.Body>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Form.Label>Status</Form.Label>
              <Form.Select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All status</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Position Applied</Form.Label>
              <Form.Control
                value={filters.position_applied}
                onChange={(event) => updateFilter('position_applied', event.target.value)}
                placeholder="Filter position"
              />
            </Col>
            <Col md={4}>
              <Form.Label>Search</Form.Label>
              <Form.Control
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Name, email, or phone"
              />
            </Col>
          </Row>

          {loading ? (
            <LoaderData />
          ) : rows.length ? (
            <>
              <div className="table-responsive">
                <Table hover align="middle" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>No.</th>
                      <th>Candidate</th>
                      <th>Contact</th>
                      <th>Position Applied</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((candidate, index) => (
                      <tr key={candidate.rowKey}>
                        <td className="text-muted">{(result.currentPage - 1) * result.perPage + index + 1}</td>
                        <td className="fw-semibold">{candidate.name}</td>
                        <td>
                          <div>{candidate.email}</div>
                          <small className="text-muted">{candidate.phone}</small>
                        </td>
                        <td>{candidate.position}</td>
                        <td>
                          <Badge bg={statusVariants[candidate.status] || 'secondary'}>{formatStatus(candidate.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <TablePagination
                currentPage={result.currentPage}
                onPageChange={setPage}
                pageCount={Math.max(result.lastPage, 1)}
                pageSize={result.perPage}
                total={result.total}
                itemLabel="candidates"
              />
            </>
          ) : (
            <div className="text-center text-muted py-5">
              <i className="ti ti-users-off f-30 d-block mb-2" />
              No candidate data found.
            </div>
          )}
        </Card.Body>
      </Card>
    </MainCard>
  );
}
