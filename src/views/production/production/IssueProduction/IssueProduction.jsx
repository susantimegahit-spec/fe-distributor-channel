import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';

const pageSize = 10;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 });
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const initialFilters = () => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay()));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: formatInputDate(monday), to: formatInputDate(sunday), whs_code: '', to_whs_code: '' };
};
const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;
const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'rows', 'issues', 'production_issues', 'documents', 'value', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;
  const detail = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const header = Array.isArray(detail?.header) ? detail.header[0] : (detail?.header ?? detail?.Header);
  if (!header) return null;
  return { header, items: detail?.items ?? detail?.Items ?? detail?.lines ?? [] };
};
const formatDate = (value) => {
  if (!value) return '-';
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatShift = (value) => ({ A: '1', B: '2', C: '3', X: 'All' })[String(value || '').toUpperCase()] || value || '-';
const normalizeIssue = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'docEntry', 'doc_entry', 'id', 'issue_id'], index),
  documentNumber: getValue(item, ['DocNum', 'doc_num', 'document_number', 'issue_number', 'number'], '-'),
  documentDate: getValue(item, ['DocDate', 'doc_date', 'document_date', 'posting_date', 'postingDate', 'created_at']),
  shift: formatShift(getValue(item, ['Shift', 'shift', 'U_Shift', 'U_SHIFT'])),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit'], '-'),
  comments: getValue(item, ['Comments', 'comments', 'remarks', 'remark'], '-'),
  raw: item
});
const normalizeKey = (key) =>
  String(key || '')
    .replaceAll('_', '')
    .toLowerCase();
const columnLabels = {
  itemcode: 'Item',
  itemname: 'Item Name',
  whscode: 'Warehouse',
  quantity: 'Quantity',
  qty: 'Quantity',
  ocrcode: 'Branch',
  ocrcode2: 'Business Unit',
  ocrcode3: 'Department'
};
const formatValue = (value, key) => {
  if (value === undefined || value === null || value === '') return '-';
  if (['qty', 'quantity'].includes(normalizeKey(key))) {
    const number = Number(value);
    return Number.isNaN(number) ? String(value) : numberFormatter.format(number);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export default function IssueProduction() {
  const { showAlert } = useAlert();
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchIssues = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }
      setLoading(true);
      try {
        const response = await ProductionServices.getIssueProduction(query);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production issues');
        setIssues(getResponseList(response).map(normalizeIssue));
        setCurrentPage(1);
      } catch (error) {
        setIssues([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production issues', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    fetchIssues(initialFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(Math.ceil(issues.length / pageSize), 1);
  const paginatedIssues = useMemo(() => {
    const start = (Math.min(currentPage, pageCount) - 1) * pageSize;
    return issues.slice(start, start + pageSize);
  }, [currentPage, issues, pageCount]);

  const handleViewDetail = async (issue) => {
    const docEntry = issue?.raw?.DocEntry ?? issue?.raw?.docEntry ?? issue?.raw?.doc_entry ?? issue?.id;
    if (docEntry === undefined || docEntry === null || docEntry === '') {
      showAlert('DocEntry was not found', 'danger');
      return;
    }
    setLoadingDetailId(docEntry);
    try {
      const response = await ProductionServices.getIssueProductionDetail(docEntry);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production issue detail');
      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Production issue detail was not found');
      setSelectedIssue(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production issue detail', 'danger');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleReset = () => {
    const defaults = initialFilters();
    setFilters(defaults);
    fetchIssues(defaults);
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Issue Production</h5>
            <span className="text-muted f-12">View materials issued to production orders in SAP.</span>
          </Stack>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((old) => ({ ...old, from: event.target.value }))}
                />
              </Col>
              <Col md={3}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((old) => ({ ...old, to: event.target.value }))}
                />
              </Col>
              <Col md={2}>
                <Form.Label>Warehouse</Form.Label>
                <Form.Control
                  value={filters.whs_code}
                  onChange={(event) => setFilters((old) => ({ ...old, whs_code: event.target.value }))}
                  placeholder="From warehouse"
                />
              </Col>
              <Col md={2}>
                <Form.Label>To Warehouse</Form.Label>
                <Form.Control
                  value={filters.to_whs_code}
                  onChange={(event) => setFilters((old) => ({ ...old, to_whs_code: event.target.value }))}
                  placeholder="To warehouse"
                />
              </Col>
              <Col md={2}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loading} onClick={() => fetchIssues()}>
                    <i className={loading ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loading ? 'Loading...' : 'Search'}
                  </Button>
                  <Button variant="light-secondary" disabled={loading} aria-label="Reset issue filters" onClick={handleReset}>
                    <i className="ti ti-refresh" />
                  </Button>
                </Stack>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Doc. No.</th>
              <th>Doc. Date</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" />
                  Loading production issues...
                </td>
              </tr>
            ) : paginatedIssues.length ? (
              paginatedIssues.map((issue, index) => (
                <tr key={issue.id || `${issue.documentNumber}-${index}`}>
                  <td>
                    <Button
                      variant="link"
                      className="p-0 fw-semibold text-decoration-none"
                      disabled={loadingDetailId !== null}
                      onClick={() => handleViewDetail(issue)}
                    >
                      {String(loadingDetailId) === String(issue.id) ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                      {issue.documentNumber}
                    </Button>
                  </td>
                  <td>{formatDate(issue.documentDate)}</td>
                  <td>{issue.shift}</td>
                  <td>{issue.unit}</td>
                  <td>{issue.comments}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No production issue data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        {!loading && issues.length ? (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={issues.length}
            itemLabel="issues"
          />
        ) : null}
      </MainCard>

      <Modal show={Boolean(selectedIssue)} onHide={() => setSelectedIssue(null)} fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Production Issue Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssue
            ? (() => {
                const issue = normalizeIssue(selectedIssue.header);
                const items = Array.isArray(selectedIssue.items) ? selectedIssue.items : [];
                const columns = [...new Set(items.flatMap((item) => Object.keys(item || {})))].filter(
                  (key) => !['docentry', 'linenum'].includes(normalizeKey(key))
                );
                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{issue.documentNumber}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatDate(issue.documentDate)}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Shift</Form.Label>
                            <div>{issue.shift}</div>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="f-12 text-muted">Unit</Form.Label>
                            <div>{issue.unit}</div>
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="f-12 text-muted">Comments</Form.Label>
                            <div>{issue.comments}</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    <Card className="border mb-0">
                      <Card.Header>
                        <h6 className="mb-0">Items</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                          <thead>
                            <tr>
                              <th>#</th>
                              {columns.map((key) => (
                                <th key={key}>{columnLabels[normalizeKey(key)] || key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((item, index) => (
                                <tr key={item?.LineNum ?? item?.line_num ?? index}>
                                  <td>{index + 1}</td>
                                  {columns.map((key) => (
                                    <td key={key}>{formatValue(item[key], key)}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={Math.max(columns.length + 1, 1)} className="text-center text-muted py-4">
                                  No issue item detail found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Stack>
                );
              })()
            : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setSelectedIssue(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
