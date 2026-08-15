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
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFilters = () => {
  const currentDate = new Date();
  const mondayOffset = currentDate.getDay() === 0 ? -6 : 1 - currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    from: formatInputDate(startOfWeek),
    to: formatInputDate(endOfWeek)
  };
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.receipts)) return payload.receipts;
  if (Array.isArray(payload?.production_receipts)) return payload.production_receipts;
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const getResponseDetail = (response) => {
  const payload = response?.data?.data ?? response?.data;
  const detail = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const header = Array.isArray(detail?.header) ? detail.header[0] : detail?.header;

  if (!header) return null;

  return {
    header,
    items: Array.isArray(detail?.items) ? detail.items : []
  };
};

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback;

const getLines = (item = {}) => {
  const lines = getValue(item, ['DocumentLines', 'document_lines', 'Lines', 'lines', 'details', 'receipt_details'], []);
  return Array.isArray(lines) ? lines : [];
};

const formatShift = (value) => {
  const shift = String(value || '').toUpperCase();
  return { A: '1', B: '2', C: '3', X: 'All' }[shift] || shift || '-';
};

const normalizeReceipt = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'doc_entry', 'id', 'receipt_id'], index),
  documentNumber: getValue(item, ['DocNum', 'doc_num', 'document_number', 'receipt_number', 'number'], '-'),
  productionOrderNumber: getValue(item, ['ProdOrderNum', 'prod_order_num', 'production_order_number'], '-'),
  documentDate: getValue(item, ['DocDate', 'doc_date', 'document_date', 'posting_date', 'postingDate', 'created_at']),
  shift: formatShift(getValue(item, ['Shift', 'shift', 'U_Shift', 'U_SHIFT'])),
  unit: getValue(item, ['U_Unit', 'u_unit', 'Unit', 'unit'], '-'),
  comments: getValue(item, ['Comments', 'comments', 'remarks', 'remark'], '-'),
  raw: item
});

const normalizeColumnKey = (key) =>
  String(key || '')
    .replaceAll('_', '')
    .toLowerCase();

const getItemColumnLabel = (key) =>
  ({
    ocr: 'Branch',
    ocr2: 'Business Unit',
    ocr3: 'Department',
    ocrcode: 'Branch',
    ocrcode2: 'Business Unit',
    ocrcode3: 'Department',
    docnum: 'Doc Num',
    linenum: 'Line Num',
    itemcode: 'Item',
    itemname: 'Item Name',
    whscode: 'Warehouse'
  })[normalizeColumnKey(key)] || key;

const formatItemValue = (value, key) => {
  if (value === undefined || value === null || value === '') return '-';
  if (['qty', 'quantity'].includes(normalizeColumnKey(key))) {
    const quantity = Number(value);
    return Number.isNaN(quantity) ? String(value) : numberFormatter.format(quantity);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const isHiddenItemColumn = (key) => ['docentry', 'linenum'].includes(normalizeColumnKey(key));

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ReceiptProduction() {
  const { showAlert } = useAlert();
  const [receipts, setReceipts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceiptDetailId, setLoadingReceiptDetailId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReceipts = useCallback(
    async (activeFilters) => {
      const query = activeFilters || filters;
      if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
        showAlert('From date cannot be after To date', 'warning');
        return;
      }

      setLoadingReceipts(true);
      try {
        const response = await ProductionServices.getReceipt({
          from: query.from || '',
          to: query.to || '',
          whs_code: '',
          to_whs_code: ''
        });
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipts');

        setReceipts(getResponseList(response).map(normalizeReceipt));
        setCurrentPage(1);
      } catch (error) {
        setReceipts([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipts', 'danger');
      } finally {
        setLoadingReceipts(false);
      }
    },
    [filters, showAlert]
  );

  useEffect(() => {
    const defaultFilters = initialFilters();
    fetchReceipts(defaultFilters);
    // Initial page load uses the current-month filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(Math.ceil(receipts.length / pageSize), 1);
  const paginatedReceipts = useMemo(() => {
    const safePage = Math.min(currentPage, pageCount);
    const startIndex = (safePage - 1) * pageSize;
    return receipts.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageCount, receipts]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const handleViewDetail = async (receipt) => {
    if (receipt?.id === undefined || receipt?.id === null || receipt?.id === '') {
      showAlert('Receipt ID was not found', 'danger');
      return;
    }

    setLoadingReceiptDetailId(receipt.id);
    try {
      const response = await ProductionServices.getReceiptDetail(receipt.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch production receipt detail');

      const detail = getResponseDetail(response);
      if (!detail) throw new Error('Production receipt detail was not found');
      setSelectedReceipt(detail);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch production receipt detail', 'danger');
    } finally {
      setLoadingReceiptDetailId(null);
    }
  };

  const handleReset = () => {
    const defaultFilters = initialFilters();
    setFilters(defaultFilters);
    fetchReceipts(defaultFilters);
  };

  return (
    <>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Receipt Production</h5>
            <span className="text-muted f-12">View finished goods receipts posted to SAP.</span>
          </Stack>
        }
      >
        <Card className="border mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Stack direction="horizontal" gap={2}>
                  <Button className="flex-grow-1" disabled={loadingReceipts} onClick={() => fetchReceipts()}>
                    <i className={loadingReceipts ? 'ti ti-loader-2 me-1' : 'ti ti-search me-1'} />
                    {loadingReceipts ? 'Loading...' : 'Search'}
                  </Button>
                  <Button variant="light-secondary" disabled={loadingReceipts} aria-label="Reset receipt filters" onClick={handleReset}>
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
            {loadingReceipts ? (
              <tr>
                <td colSpan={5} className="text-center py-5">
                  <span className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                  Loading production receipts...
                </td>
              </tr>
            ) : paginatedReceipts.length ? (
              paginatedReceipts.map((receipt, index) => {
                return (
                  <tr key={receipt.id || `${receipt.documentNumber}-${index}`}>
                    <td>
                      <Button
                        variant="link"
                        className="p-0 fw-semibold text-decoration-none"
                        disabled={loadingReceiptDetailId !== null}
                        onClick={() => handleViewDetail(receipt)}
                      >
                        {String(loadingReceiptDetailId) === String(receipt.id) ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                        ) : null}
                        {receipt.documentNumber}
                      </Button>
                    </td>
                    <td>{formatDate(receipt.documentDate)}</td>
                    <td>{receipt.shift}</td>
                    <td>{receipt.unit}</td>
                    <td>{receipt.comments}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  No production receipt data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {!loadingReceipts && receipts.length > 0 ? (
          <TablePagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={receipts.length}
            itemLabel="receipts"
          />
        ) : null}
      </MainCard>

      <Modal show={Boolean(selectedReceipt)} onHide={() => setSelectedReceipt(null)} fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Production Receipt Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReceipt
            ? (() => {
                const receipt = normalizeReceipt(selectedReceipt.header);
                const items = selectedReceipt.items;
                const itemColumns = [...new Set(items.flatMap((item) => Object.keys(item || {})))].filter(
                  (column) => !isHiddenItemColumn(column) && normalizeColumnKey(column) !== 'itemname'
                );

                return (
                  <Stack gap={4}>
                    <Card className="border mb-0">
                      <Card.Body>
                        <Row className="g-3">
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document No.</Form.Label>
                            <div className="fw-semibold">{receipt.documentNumber}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Document Date</Form.Label>
                            <div>{formatDate(receipt.documentDate)}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Shift</Form.Label>
                            <div>{receipt.shift}</div>
                          </Col>
                          <Col md={4}>
                            <Form.Label className="f-12 text-muted">Unit</Form.Label>
                            <div>{receipt.unit}</div>
                          </Col>
                          <Col xs={12}>
                            <Form.Label className="f-12 text-muted">Comments</Form.Label>
                            <div>{receipt.comments}</div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Card className="border mb-0">
                      <Card.Header>
                        <h6 className="mb-0">Items</h6>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <Table responsive hover className="mb-0 align-middle">
                          <thead>
                            <tr>
                              <th>#</th>
                              {itemColumns.map((column) => (
                                <th key={column}>{getItemColumnLabel(column)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.length ? (
                              items.map((item, index) => (
                                <tr key={item?.LineNum ?? item?.line_num ?? item?.id ?? index}>
                                  <td>{index + 1}</td>
                                  {itemColumns.map((column) => (
                                    <td key={column}>
                                      {normalizeColumnKey(column) === 'itemcode' ? (
                                        <>
                                          <div className="fw-semibold">{formatItemValue(item?.[column], column)}</div>
                                          <div className="text-muted f-12">
                                            {formatItemValue(item?.itemName ?? item?.ItemName ?? item?.item_name, 'itemname')}
                                          </div>
                                        </>
                                      ) : (
                                        formatItemValue(item?.[column], column)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={Math.max(itemColumns.length + 1, 1)} className="text-center text-muted py-4">
                                  No receipt item detail found.
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
          <Button variant="light-secondary" onClick={() => setSelectedReceipt(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
