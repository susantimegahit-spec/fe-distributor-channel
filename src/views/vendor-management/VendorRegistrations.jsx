import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import VendorManagementServices from 'services/vendor-management/VendorManagementServices';
import { useAlert } from 'utils/alertContext';

const pageSize = 10;

const getRegistrations = (response) => {
  const data = response?.data?.data ?? response?.data ?? {};
  if (Array.isArray(data)) return { rows: data, total: data.length };

  const rows = data?.data ?? data?.items ?? data?.registrations ?? [];
  return {
    rows: Array.isArray(rows) ? rows : [],
    total: Number(data?.total ?? rows?.length ?? 0)
  };
};

const getValue = (vendor, keys, fallback = '-') => {
  const value = keys.map((key) => vendor?.[key]).find((item) => item !== undefined && item !== null && item !== '');
  return value ?? fallback;
};

const statusVariant = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['approved', 'active', 'verified'].includes(normalized)) return 'success';
  if (['rejected', 'inactive'].includes(normalized)) return 'danger';
  if (['pending', 'submitted', 'review'].includes(normalized)) return 'warning';
  return 'secondary';
};

export default function VendorRegistrations() {
  const { showAlert } = useAlert();
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await VendorManagementServices.getVendorRegister({
        page,
        per_page: pageSize,
        search: debouncedSearch || undefined
      });
      if (!(response?.status >= 200 && response.status < 300)) {
        throw Object.assign(new Error('Unable to load vendor registrations.'), { response });
      }
      const result = getRegistrations(response);
      setRegistrations(result.rows);
      setTotal(result.total);
    } catch (error) {
      setRegistrations([]);
      setTotal(0);
      showAlert(error.response?.data?.message || error.message || 'Unable to load vendor registrations.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, showAlert]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasRows = registrations.length > 0;
  const summary = useMemo(
    () => ({
      pending: registrations.filter((item) =>
        ['pending', 'submitted', 'review'].includes(String(getValue(item, ['status'], '')).toLowerCase())
      ).length,
      total
    }),
    [registrations, total]
  );

  return (
    <MainCard
      title="Vendor Registrations"
      subheader="Review companies that have registered through the Vendor Portal."
      secondary={
        <Button variant="outline-primary" size="sm" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
          <i className="ti ti-refresh me-1" /> Refresh
        </Button>
      }
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex gap-2">
          <Badge bg="light-warning" text="warning" className="px-3 py-2">
            {summary.pending} pending on this page
          </Badge>
          <Badge bg="light-primary" text="primary" className="px-3 py-2">
            {summary.total} total registrations
          </Badge>
        </div>
        <InputGroup style={{ maxWidth: 320 }}>
          <InputGroup.Text>
            <i className="ti ti-search" />
          </InputGroup.Text>
          <Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, email, or PIC" />
        </InputGroup>
      </div>

      <Table responsive hover className="mb-0 align-middle">
        <thead>
          <tr>
            <th>Company</th>
            <th>Vendor type</th>
            <th>Contact person</th>
            <th>Registered at</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="py-5 text-center text-muted">
                <Spinner size="sm" className="me-2" /> Loading vendor registrations...
              </td>
            </tr>
          ) : null}
          {!loading && hasRows
            ? registrations.map((vendor, index) => {
                const status = getValue(vendor, ['status', 'registration_status'], 'Pending');
                return (
                  <tr key={getValue(vendor, ['id', 'uuid', 'vendor_id'], index)}>
                    <td>
                      <strong className="d-block">{getValue(vendor, ['company_name', 'name'])}</strong>
                      <small className="text-muted">{getValue(vendor, ['company_email', 'email'])}</small>
                    </td>
                    <td className="text-capitalize">{getValue(vendor, ['vendor_type', 'type'])}</td>
                    <td>
                      <span className="d-block">{getValue(vendor, ['pic_name', 'contact_name'])}</span>
                      <small className="text-muted">{getValue(vendor, ['pic_phone', 'phone'])}</small>
                    </td>
                    <td>{getValue(vendor, ['created_at', 'registered_at'])}</td>
                    <td>
                      <Badge bg={`light-${statusVariant(status)}`} text={statusVariant(status)} className="text-capitalize">
                        {status}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            : null}
          {!loading && !hasRows ? (
            <tr>
              <td colSpan={5} className="py-5 text-center text-muted">
                No vendor registrations found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </Table>
      {!loading && total > 0 ? (
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={total}
          itemLabel="registrations"
        />
      ) : null}
    </MainCard>
  );
}
