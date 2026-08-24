import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import ProductionServices from '../../../../services/production/ProductionServices';
import { useAlert } from '../../../../utils/alertContext';
import { getCookies } from '../../../../utils/cookies';

const pageSize = 10;
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 });
const shiftOptions = [
  { value: 'X', label: 'All' },
  { value: 'A', label: '1' },
  { value: 'B', label: '2' },
  { value: 'C', label: '3' }
];
const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 1090 }),
  control: (base) => ({ ...base, minHeight: 38 })
};
const today = new Date().toLocaleDateString('en-CA');
const createIssueForm = () => ({
  DocDate: today,
  DocDueDate: today,
  Comments: '',
  Shift: 'X',
  Unit: '',
  Lines: []
});
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatInputDateValue = (value) => {
  if (!value) return today;
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = compact ? new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? today : formatInputDate(date);
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
  for (const key of [
    'data',
    'items',
    'rows',
    'issues',
    'production_issues',
    'orders',
    'production_orders',
    'documents',
    'units',
    'value',
    'results'
  ]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};
const normalizeUnit = (item = {}) => {
  const value = typeof item === 'object' ? item.u_unit || item.U_Unit || item.unit || item.Unit || item.code || item.value || '' : item;
  const label = typeof item === 'object' ? item.unit_name || item.UnitName || item.name || item.label || item.description || value : item;

  return value ? { value, label: String(label) } : null;
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
const normalizeProductionOrder = (item = {}, index = 0) => ({
  id: getValue(item, ['DocEntry', 'docEntry', 'doc_entry', 'id', 'production_order_id'], index),
  number: getValue(item, ['DocNum', 'doc_num', 'prod_order_no', 'production_order_no', 'number'], '-'),
  itemCode: getValue(item, ['ItemCode', 'item_code', 'product_code', 'code']),
  itemName: getValue(item, ['ProdName', 'ItemName', 'item_name', 'product_name', 'name']),
  plannedQuantity: Number(getValue(item, ['PlannedQty', 'PlannedQuantity', 'planned_qty', 'planned_quantity', 'quantity'], 0)),
  warehouse: getValue(item, ['Warehouse', 'WhsCode', 'whs_code', 'warehouse_code']),
  status: getValue(item, ['ProductionOrderStatus', 'Status', 'status', 'order_status']),
  raw: item
});
const getProductionOrderDetail = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  const header = payload?.header ?? payload?.Header ?? payload?.data ?? payload?.order ?? payload?.production_order ?? payload;
  const items = payload?.items ?? payload?.Items ?? payload?.details ?? payload?.order_details ?? [];
  return { header: header || {}, items: Array.isArray(items) ? items : [] };
};
const getIssuePlannedQuantity = (line = {}) =>
  Number(
    getValue(
      line,
      [
        'PlannedQty',
        'plannedQty',
        'planned_qty',
        'PlannedQuantity',
        'plannedQuantity',
        'planned_quantity',
        'RequiredQty',
        'required_qty',
        'BaseQty',
        'base_qty',
        'Quantity',
        'quantity',
        'qty'
      ],
      0
    )
  );
const getIssueIssuedQuantity = (line = {}) =>
  Number(
    getValue(
      line,
      ['IssuedQty', 'issuedQty', 'issued_qty', 'IssuedQuantity', 'issuedQuantity', 'issued_quantity', 'IssueQty', 'issue_qty'],
      0
    )
  );
const getRemainingIssueQuantity = (line = {}) => Math.max(Number(line.PlannedQty || 0) - Number(line.IssuedQty || 0), 0);
const cannotPostIssueLine = (line = {}) => Number(line.IssuedQty || 0) >= Number(line.PlannedQty || 0);
const createIssueLine = (line = {}, header = {}, index = 0) => {
  const plannedQty = getIssuePlannedQuantity(line);
  const issuedQty = getIssueIssuedQuantity(line);

  return {
    ItemCode: getValue(line, ['ItemCode', 'ItemNo', 'itemNo', 'item_code', 'code']),
    ItemName: getValue(line, ['ItemName', 'itemName', 'item_name', 'ItemDescription', 'item_description', 'name']),
    BaseType: Number(getValue(line, ['BaseType', 'base_type'], 202)),
    BaseEntry: Number(getValue(line, ['BaseEntry', 'base_entry'], getValue(header, ['DocEntry', 'docEntry', 'doc_entry', 'id'], ''))),
    BaseLine: Number(getValue(line, ['BaseLine', 'base_line', 'LineNum', 'line_num'], index)),
    PlannedQty: plannedQty,
    IssuedQty: issuedQty,
    Quantity: Math.max(plannedQty - issuedQty, 0),
    WhsCode: getValue(line, ['WhsCode', 'whs_code', 'Warehouse', 'warehouse_code'], getValue(header, ['Warehouse', 'WhsCode', 'whs_code'])),
    UoMEntry: Number(getValue(line, ['UoMEntry', 'UomEntry', 'uom_entry'], 0)),
    OcrCode: getValue(line, ['OcrCode', 'ocr_code'], getValue(header, ['OcrCode', 'ocr_code'])),
    OcrCode2: getValue(line, ['OcrCode2', 'ocr_code2'], getValue(header, ['OcrCode2', 'ocr_code2'])),
    OcrCode3: getValue(line, ['OcrCode3', 'ocr_code3'], getValue(header, ['OcrCode3', 'ocr_code3']))
  };
};
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
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [issueForm, setIssueForm] = useState(createIssueForm);
  const [savingIssue, setSavingIssue] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [productionOrders, setProductionOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderFilters, setOrderFilters] = useState(initialFilters);
  const [orderSearch, setOrderSearch] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingOrderDetailId, setLoadingOrderDetailId] = useState(null);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);

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

  const fetchUnitOptions = async () => {
    if (unitOptions.length) return;

    setLoadingUnits(true);
    try {
      const response = await ProductionServices.getUnit();
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch unit data');
      setUnitOptions(getResponseList(response).map(normalizeUnit).filter(Boolean));
    } catch (error) {
      setUnitOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch unit data', 'danger');
    } finally {
      setLoadingUnits(false);
    }
  };

  const filteredProductionOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return productionOrders;

    return productionOrders.filter((order) =>
      [order.number, order.itemCode, order.itemName, order.warehouse].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [orderSearch, productionOrders]);

  const fetchProductionOrders = async () => {
    if (orderFilters.from && orderFilters.to && new Date(orderFilters.from) > new Date(orderFilters.to)) {
      showAlert('From date cannot be after To date', 'warning');
      return;
    }
    setLoadingOrders(true);
    try {
      const response = await ProductionServices.getListOrderSap({ ...orderFilters, status: 'Release' });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');
      setProductionOrders(getResponseList(response).map(normalizeProductionOrder));
    } catch (error) {
      setProductionOrders([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data', 'danger');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenOrderSelection = () => {
    setSelectedOrderIds([...new Set(issueForm.Lines.map((line) => String(line.BaseEntry)))]);
    setShowOrderModal(true);
    fetchProductionOrders();
  };

  const handleToggleProductionOrder = (orderId, isChecked) => {
    const normalizedId = String(orderId);
    setSelectedOrderIds((current) => (isChecked ? [...new Set([...current, normalizedId])] : current.filter((id) => id !== normalizedId)));
  };

  const handleAddSelectedProductionOrders = async () => {
    if (!selectedOrderIds.length) {
      showAlert('Select at least one Production Order', 'warning');
      return;
    }

    const existingEntryIds = issueForm.Lines.map((line) => String(line.BaseEntry));
    const selectedOrders = productionOrders.filter(
      (order) => selectedOrderIds.includes(String(order.id)) && !existingEntryIds.includes(String(order.id))
    );

    setLoadingOrderDetailId('selected');
    try {
      const orderDetails = await Promise.all(
        selectedOrders.map(async (order) => {
          const response = await ProductionServices.getProductionOrderById(order.id);
          if (response?.data?.success === false) {
            throw new Error(response.data.message || `Failed to fetch Production Order ${order.number}`);
          }
          const { header, items } = getProductionOrderDetail(response);
          const lines = items.map((line, index) => createIssueLine(line, header, index));
          if (!lines.length) throw new Error(`No material lines were found in Production Order ${order.number}`);
          return { header, lines };
        })
      );
      const firstHeader = orderDetails[0]?.header || {};

      setIssueForm((current) => ({
        ...current,
        DocDueDate: formatInputDateValue(getValue(firstHeader, ['DueDate', 'due_date'], current.DocDueDate)),
        Comments: current.Comments || getValue(firstHeader, ['Comments', 'comments', 'remarks']),
        Shift: getValue(firstHeader, ['U_Shift', 'Shift', 'shift'], current.Shift),
        Unit: getValue(firstHeader, ['U_Unit', 'Unit', 'unit', 'OcrCode2', 'ocr_code2'], current.Unit),
        Lines: [
          ...current.Lines.filter((line) => selectedOrderIds.includes(String(line.BaseEntry))),
          ...orderDetails.flatMap((detail) => detail.lines)
        ]
      }));
      setShowOrderModal(false);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch Production Order detail', 'danger');
    } finally {
      setLoadingOrderDetailId(null);
    }
  };

  const updateIssueLine = (lineIndex, values) => {
    setIssueForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, index) => (index === lineIndex ? { ...line, ...values } : line))
    }));
  };

  const handleDeleteIssueLine = (lineIndex) => {
    setIssueForm((current) => ({ ...current, Lines: current.Lines.filter((_, index) => index !== lineIndex) }));
  };

  const handleSubmitIssue = async () => {
    const unpostableLines = issueForm.Lines.filter(cannotPostIssueLine);
    if (unpostableLines.length) {
      const itemCodes = unpostableLines.map((line) => line.ItemCode || `Base Entry ${line.BaseEntry}`).join(', ');
      showAlert(`Issued Qty must be less than Planned Qty for: ${itemCodes}. These rows cannot be posted`, 'warning');
      return;
    }

    const invalidLine = issueForm.Lines.some(
      (line) => !(Number(line.BaseEntry) > 0) || !Number.isFinite(Number(line.BaseLine)) || !(Number(line.Quantity) > 0) || !line.WhsCode
    );
    if (!issueForm.DocDate || !issueForm.DocDueDate || !issueForm.Lines.length || invalidLine) {
      showAlert('Complete document dates, Base Entry, Base Line, Quantity, and Warehouse for every line', 'warning');
      return;
    }
    const exceedsRemainingQuantity = issueForm.Lines.some((line) => Number(line.Quantity) > getRemainingIssueQuantity(line));
    if (exceedsRemainingQuantity) {
      showAlert('Quantity cannot exceed Planned Qty minus Issued Qty', 'warning');
      return;
    }

    const payload = {
      ...issueForm,
      AddonId: String(getCookies('addonId') ?? ''),
      UserId: String(getCookies('id') ?? ''),
      Lines: issueForm.Lines.map(({ ItemCode, ItemName, PlannedQty, IssuedQty, ...line }) => ({
        ...line,
        BaseType: Number(line.BaseType),
        BaseEntry: Number(line.BaseEntry),
        BaseLine: Number(line.BaseLine),
        Quantity: Number(line.Quantity),
        UoMEntry: Number(line.UoMEntry || 0)
      }))
    };

    setSavingIssue(true);
    try {
      const response = await ProductionServices.postIssueProduction(payload);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to add production issue');
      setShowAddIssue(false);
      setIssueForm(createIssueForm());
      showAlert(response?.data?.message || 'Production issue added successfully', 'success');
      await fetchIssues();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to add production issue', 'danger');
    } finally {
      setSavingIssue(false);
    }
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
        secondary={
          <Button
            variant="success"
            onClick={() => {
              setIssueForm(createIssueForm());
              setShowAddIssue(true);
              fetchUnitOptions();
            }}
          >
            <i className="ti ti-plus me-1" />
            Add Issue
          </Button>
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
                  onChange={(event) => setFilters((old) => ({ ...old, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((old) => ({ ...old, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
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

      <Modal show={showAddIssue} onHide={() => !savingIssue && setShowAddIssue(false)} fullscreen scrollable>
        <Modal.Header closeButton={!savingIssue}>
          <Modal.Title>Add Issue Production</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Label>Document Date *</Form.Label>
              <Form.Control
                type="date"
                value={issueForm.DocDate}
                onChange={(event) => setIssueForm((current) => ({ ...current, DocDate: event.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Due Date *</Form.Label>
              <Form.Control
                type="date"
                value={issueForm.DocDueDate}
                onChange={(event) => setIssueForm((current) => ({ ...current, DocDueDate: event.target.value }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Shift</Form.Label>
              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={shiftOptions}
                value={shiftOptions.find((option) => option.value === issueForm.Shift) || null}
                placeholder="Select shift"
                onChange={(option) => setIssueForm((current) => ({ ...current, Shift: option?.value || '' }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Unit</Form.Label>
              <Select
                styles={selectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                maxMenuHeight={240}
                menuShouldScrollIntoView={false}
                options={unitOptions}
                value={
                  unitOptions.find((option) => String(option.value) === String(issueForm.Unit)) ||
                  (issueForm.Unit ? { value: issueForm.Unit, label: issueForm.Unit } : null)
                }
                isLoading={loadingUnits}
                isDisabled={loadingUnits}
                isClearable
                placeholder={loadingUnits ? 'Loading units...' : 'Select unit'}
                onChange={(option) => setIssueForm((current) => ({ ...current, Unit: option?.value || '' }))}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={issueForm.Comments}
                onChange={(event) => setIssueForm((current) => ({ ...current, Comments: event.target.value }))}
              />
            </Col>
          </Row>

          <Stack direction="horizontal" className="justify-content-between mb-2">
            <h6 className="mb-0">Items</h6>
            <Button size="sm" variant="outline-primary" onClick={handleOpenOrderSelection}>
              <i className="ti ti-plus me-1" /> Add PDO
            </Button>
          </Stack>
          <Table responsive bordered className="align-middle mb-0">
            <thead>
              <tr>
                <th>Item</th>
                <th>Planned Qty</th>
                <th>Issued Qty</th>
                <th>Qty</th>
                <th>Warehouse</th>
                <th>Branch</th>
                <th>Business Unit</th>
                <th>Department</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {issueForm.Lines.length ? (
                issueForm.Lines.map((line, index) => (
                  <tr key={`${line.BaseEntry}-${line.BaseLine}-${index}`} className={cannotPostIssueLine(line) ? 'table-warning' : ''}>
                    <td style={{ minWidth: 180 }}>
                      <div className="fw-semibold">{line.ItemCode || '-'}</div>
                      <div className="text-muted f-12">{line.ItemName || '-'}</div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.PlannedQty} readOnly />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control size="sm" type="number" value={line.IssuedQty} readOnly isInvalid={cannotPostIssueLine(line)} />
                      {cannotPostIssueLine(line) ? (
                        <Form.Text className="text-danger">Issued Qty must be less than Planned Qty.</Form.Text>
                      ) : null}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <Form.Control
                        size="sm"
                        type="number"
                        min="0"
                        max={getRemainingIssueQuantity(line)}
                        step="any"
                        value={line.Quantity}
                        disabled={cannotPostIssueLine(line)}
                        onChange={(event) => {
                          const value = event.target.value;
                          const quantity = value === '' ? '' : Math.min(Math.max(Number(value), 0), getRemainingIssueQuantity(line));
                          updateIssueLine(index, { Quantity: quantity });
                        }}
                      />
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <Form.Control size="sm" value={line.WhsCode} readOnly />
                    </td>
                    {['OcrCode', 'OcrCode2', 'OcrCode3'].map((field) => (
                      <td key={field} style={{ minWidth: 130 }}>
                        <Form.Control size="sm" value={line[field]} readOnly />
                      </td>
                    ))}
                    <td className="text-center">
                      <Button
                        type="button"
                        className="btn-icon avatar-s"
                        size="sm"
                        variant="outline-danger"
                        data-permission-action="create"
                        aria-label={`Delete ${line.ItemCode || 'item'}`}
                        onClick={() => handleDeleteIssueLine(index)}
                      >
                        <i className="ti ti-trash" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No items added. Click Add PDO to select a Production Order.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={savingIssue} onClick={() => setShowAddIssue(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={savingIssue} onClick={handleSubmitIssue}>
            {savingIssue ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
            {savingIssue ? 'Saving...' : 'Save Issue'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showOrderModal}
        onHide={() => !loadingOrders && !loadingOrderDetailId && setShowOrderModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton={!loadingOrders && !loadingOrderDetailId}>
          <Modal.Title>Select Production Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            className="mb-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchProductionOrders();
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.from}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, from: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={orderFilters.to}
                  onChange={(event) => setOrderFilters((current) => ({ ...current, to: event.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Search PDO</Form.Label>
                <InputGroup>
                  <Form.Control
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Order number or product"
                  />
                  <Button type="submit" disabled={loadingOrders} aria-label="Search Production Order">
                    <i className="ti ti-search" />
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Form>
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 52 }}>
                  Select
                </th>
                <th>Order No.</th>
                <th>Product</th>
                <th>Planned Qty</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr>
                  <td colSpan={4} className="text-center py-4">
                    <span className="spinner-border spinner-border-sm me-2" /> Loading Production Orders...
                  </td>
                </tr>
              ) : filteredProductionOrders.length ? (
                filteredProductionOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        aria-label={`Select PDO ${order.number}`}
                        checked={selectedOrderIds.includes(String(order.id))}
                        onChange={(event) => handleToggleProductionOrder(order.id, event.target.checked)}
                      />
                    </td>
                    <td className="fw-semibold">{order.number}</td>
                    <td>
                      <div className="fw-semibold">{order.itemCode || '-'}</div>
                      <div className="text-muted f-12">{order.itemName || '-'}</div>
                    </td>
                    <td>{numberFormatter.format(order.plannedQuantity)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No released Production Order found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" disabled={loadingOrderDetailId !== null} onClick={() => setShowOrderModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={loadingOrderDetailId !== null || !selectedOrderIds.length}
            onClick={handleAddSelectedProductionOrders}
          >
            {loadingOrderDetailId !== null ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-plus me-1" />}
            {loadingOrderDetailId !== null ? 'Adding...' : `Add Selected PDO (${selectedOrderIds.length})`}
          </Button>
        </Modal.Footer>
      </Modal>

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
                  (key) => !['docentry', 'linenum', 'baseentry'].includes(normalizeKey(key))
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
