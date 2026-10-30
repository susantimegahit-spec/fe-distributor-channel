import { Fragment, useState } from 'react';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import PurchasingServices from '../../../../services/corporate/PurchasingServices';
import FormDatePicker from '../../../../components/FormDatePicker';
import { useAlert } from '../../../../utils/alertContext';
import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';
import { createPublicQuotation, getPublicQuotations, getQuotationOffers } from '../../../../utils/publicQuotations';
import './purchase-quotation.scss';

const getValue = (item, keys, fallback = '') => {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && entry !== '');
  return value ?? fallback;
};

const formatQuantity = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity.toLocaleString('id-ID', { maximumFractionDigits: 6 }) : '-';
};

const formatDisplayDate = (value) => {
  if (!value) return '-';
  const normalizedValue = String(value).trim();
  const compactDate = normalizedValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) return `${compactDate[3]}/${compactDate[2]}/${compactDate[1]}`;
  const isoDate = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  return normalizedValue;
};

const getList = (response) => {
  const root = response?.data?.data ?? response?.data ?? response ?? [];
  const payload = root.Result ?? root.result ?? root;
  const list = Array.isArray(payload) ? payload : (payload.data ?? payload.items ?? payload.rows ?? payload.results ?? []);
  return Array.isArray(list) ? list : [];
};

const getDetailPayload = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const request =
    payload.header ??
    (Array.isArray(payload.Table1) ? payload.Table1[0] : null) ??
    payload.request ??
    payload.purchase_request ??
    payload.purchaseRequest ??
    payload;
  const lines =
    payload.items ??
    payload.Table2 ??
    payload.details ??
    payload.lines ??
    payload.Lines ??
    request.details ??
    request.lines ??
    request.Lines ??
    [];
  return { request, lines: Array.isArray(lines) ? lines : [] };
};

const getRequestId = (request) => getValue(request, ['DocEntry', 'doc_entry', 'id', 'request_id', 'DraftEntry', 'draft_entry'], '');

const getRequestNumber = (request) => getValue(request, ['sap_doc_num', 'DocNum', 'doc_num', 'DraftNum', 'draft_num'], '-');

const getLineKey = (requestId, line, index) => `${requestId}:${getValue(line, ['id', 'line_id', 'LineNum', 'line_num'], index)}`;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthFilters = () => {
  const currentDate = new Date();
  return {
    from: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)),
    to: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))
  };
};

export default function PurchaseQuotation() {
  const { showAlert } = useAlert();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [requestLines, setRequestLines] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [dateFilters, setDateFilters] = useState(getCurrentMonthFilters);
  const [quotations, setQuotations] = useState(getPublicQuotations);
  const [copiedToken, setCopiedToken] = useState('');
  const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
  const getOfferUrl = (token) => `${window.location.origin}${baseName}/quotation-offer/${token}`;

  const metrics = [
    { label: 'Draft Quotations', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
    { label: 'Open Quotations', value: quotations.length, variant: 'primary', icon: 'ti ti-file-dollar' },
    {
      label: 'Submitted',
      value: quotations.reduce((total, quotation) => total + getQuotationOffers(quotation.id).length, 0),
      variant: 'warning',
      icon: 'ti ti-send'
    },
    { label: 'Completed', value: 0, variant: 'success', icon: 'ti ti-circle-check' }
  ];

  const loadRequests = async (filters = dateFilters) => {
    setLoadingRequests(true);
    setExpandedRequests({});
    setRequestLines({});
    try {
      const response = await PurchasingServices.getGeneratedPr({
        From: filters.from.replaceAll('-', ''),
        To: filters.to.replaceAll('-', '')
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load purchase requests');
      setRequests(getList(response));
    } catch (error) {
      setRequests([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load purchase requests', 'danger');
    } finally {
      setLoadingRequests(false);
    }
  };

  const openRequestModal = async () => {
    const monthFilters = getCurrentMonthFilters();
    setSelectedItems({});
    setShowRequestModal(true);
    setDateFilters(monthFilters);
    await loadRequests(monthFilters);
  };

  const applyDateFilters = (event) => {
    event.preventDefault();
    loadRequests(dateFilters);
  };

  const resetDateFilters = () => {
    const monthFilters = getCurrentMonthFilters();
    setDateFilters(monthFilters);
    loadRequests(monthFilters);
  };

  const toggleRequest = async (request) => {
    const requestId = String(getRequestId(request));
    if (!requestId) return;

    if (expandedRequests[requestId]) {
      setExpandedRequests((current) => ({ ...current, [requestId]: false }));
      return;
    }

    setExpandedRequests((current) => ({ ...current, [requestId]: true }));
    if (requestLines[requestId]) return;

    setLoadingDetails((current) => ({ ...current, [requestId]: true }));
    try {
      const response = await PurchasingServices.getDetailPR(requestId);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load request details');
      const detail = getDetailPayload(response);
      setRequestLines((current) => ({ ...current, [requestId]: detail.lines }));
    } catch (error) {
      setExpandedRequests((current) => ({ ...current, [requestId]: false }));
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load request details', 'danger');
    } finally {
      setLoadingDetails((current) => ({ ...current, [requestId]: false }));
    }
  };

  const toggleItem = (request, line, index) => {
    const requestId = String(getRequestId(request));
    const key = getLineKey(requestId, line, index);
    setSelectedItems((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = { requestId, requestNumber: getRequestNumber(request), line };
      return next;
    });
  };

  const toggleAllRequestItems = (request, lines) => {
    const requestId = String(getRequestId(request));
    const lineEntries = lines.map((line, index) => ({ key: getLineKey(requestId, line, index), line }));
    const allSelected = lineEntries.length > 0 && lineEntries.every(({ key }) => Boolean(selectedItems[key]));

    setSelectedItems((current) => {
      const next = { ...current };
      lineEntries.forEach(({ key, line }) => {
        if (allSelected) delete next[key];
        else next[key] = { requestId, requestNumber: getRequestNumber(request), line };
      });
      return next;
    });
  };

  const closeModal = () => {
    setShowSelectedModal(false);
    setShowRequestModal(false);
  };
  const removeSelectedItem = (key) => {
    setSelectedItems((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const selectedCount = Object.keys(selectedItems).length;
  const selectedItemEntries = Object.entries(selectedItems);

  const createQuotation = () => {
    if (!selectedItemEntries.length) return;
    const items = selectedItemEntries.map(([key, selected]) => ({
      id: key,
      requestId: selected.requestId,
      requestNumber: selected.requestNumber,
      itemCode: getValue(selected.line, ['item_code', 'ItemCode'], '-'),
      itemName: getValue(selected.line, ['item_name', 'ItemName', 'description', 'Dscription'], '-'),
      quantity: Number(getValue(selected.line, ['quantity', 'Quantity'], 0)) || 0,
      unit: getValue(selected.line, ['unit', 'UnitMsr', 'UomCode'], '-'),
      warehouse: getValue(selected.line, ['warehouse', 'WhsCode', 'whs_code'], '-'),
      requiredDate: getValue(selected.line, ['required_date', 'PQTReqDate', 'pqt_req_date'], '')
    }));
    const quotation = createPublicQuotation(items);
    setQuotations(getPublicQuotations());
    setSelectedItems({});
    closeModal();
    showAlert(`Request quotation ${quotation.number} berhasil dibuat`, 'success');
  };

  const copyOfferLink = async (token) => {
    await navigator.clipboard.writeText(getOfferUrl(token));
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(''), 1800);
  };

  return (
    <>
      <EnterpriseWorkspace
        title="Quotation"
        description="Create and manage supplier quotation requests from approved purchase request items."
        icon="ti ti-file-dollar"
        actionLabel="Create Request Quotation"
        onAction={openRequestModal}
        metrics={metrics}
        compactMetrics
        columns={['Quotation No.', 'Date', 'Supplier', 'Purchase Request', 'Status', 'Action']}
        emptyMessage="Quotation data will appear here after the quotation API is available."
        tableBody={
          quotations.length
            ? quotations.map((quotation) => {
                const requestNumbers = [...new Set(quotation.items.map((item) => item.requestNumber))].join(', ');
                const offerCount = getQuotationOffers(quotation.id).length;
                return (
                  <tr key={quotation.id}>
                    <td className="fw-semibold">{quotation.number}</td>
                    <td>{formatDisplayDate(quotation.createdAt)}</td>
                    <td>{offerCount ? `${offerCount} penawaran` : '-'}</td>
                    <td>{requestNumbers}</td>
                    <td>
                      <Badge bg={offerCount ? 'light-success' : 'light-primary'} text={offerCount ? 'success' : 'primary'}>
                        {offerCount ? 'SUBMITTED' : quotation.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" onClick={() => copyOfferLink(quotation.token)}>
                          <i className="ti ti-copy me-1" />
                          {copiedToken === quotation.token ? 'Copied' : 'Copy Link'}
                        </Button>
                        <Button size="sm" variant="outline-secondary" href={getOfferUrl(quotation.token)} target="_blank">
                          <i className="ti ti-external-link me-1" />
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            : undefined
        }
      />

      <Modal
        show={showRequestModal}
        onHide={closeModal}
        fullscreen
        scrollable
        backdrop="static"
        dialogClassName={showSelectedModal ? 'purchase-quotation-background-blurred' : undefined}
        backdropClassName="purchase-quotation-blur-backdrop"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Request Quotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Expand a purchase request, then select one or more items to include in the quotation.</p>
          <Form className="purchase-quotation-date-filters mb-3" onSubmit={applyDateFilters}>
            <InputGroup size="sm">
              <InputGroup.Text>From</InputGroup.Text>
              <FormDatePicker
                type="date"
                aria-label="Purchase request from date"
                value={dateFilters.from}
                max={dateFilters.to || undefined}
                onChange={(event) => setDateFilters((current) => ({ ...current, from: event.target.value }))}
              />
            </InputGroup>
            <InputGroup size="sm">
              <InputGroup.Text>To</InputGroup.Text>
              <FormDatePicker
                type="date"
                aria-label="Purchase request to date"
                value={dateFilters.to}
                min={dateFilters.from || undefined}
                onChange={(event) => setDateFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </InputGroup>
            <Button type="submit" size="sm" variant="primary" disabled={loadingRequests}>
              <i className="ti ti-search me-1" />
              Search
            </Button>
            <Button type="button" size="sm" variant="light-secondary" disabled={loadingRequests} onClick={resetDateFilters}>
              <i className="ti ti-refresh me-1" />
              Reset
            </Button>
          </Form>
          <div className="purchase-quotation-request-list table-responsive border rounded">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th className="purchase-quotation-expand-column" aria-label="Expand" />
                  <th>Request No.</th>
                  <th>Request Date</th>
                  <th>Department</th>
                  <th>Requester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading purchase requests...
                    </td>
                  </tr>
                ) : requests.length ? (
                  requests.map((request, requestIndex) => {
                    const requestId = String(getRequestId(request) || requestIndex);
                    const isExpanded = Boolean(expandedRequests[requestId]);
                    const lines = requestLines[requestId] || [];
                    return (
                      <Fragment key={requestId}>
                        <tr>
                          <td className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="light-primary"
                              className="purchase-quotation-expand-button"
                              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} request ${getRequestNumber(request)}`}
                              aria-expanded={isExpanded}
                              onClick={() => toggleRequest(request)}
                            >
                              <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                            </Button>
                          </td>
                          <td className="fw-semibold">{getRequestNumber(request)}</td>
                          <td>{formatDisplayDate(getValue(request, ['request_date', 'doc_date', 'DocDate', 'created_at']))}</td>
                          <td>{getValue(request, ['department', 'department_name', 'Department'], '-')}</td>
                          <td>{getValue(request, ['requester_name', 'RequesterName', 'requester'], '-')}</td>
                          <td>
                            <Badge bg="light-success" text="success">
                              {getValue(request, ['status', 'DocStatus', 'document_status'], 'OPEN')}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="purchase-quotation-detail-cell">
                              {loadingDetails[requestId] ? (
                                <div className="text-center text-muted py-4">
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Loading request items...
                                </div>
                              ) : lines.length ? (
                                <Table size="sm" className="purchase-quotation-item-table mb-0 align-middle">
                                  <thead>
                                    <tr>
                                      <th className="purchase-quotation-check-column">
                                        <Form.Check
                                          type="checkbox"
                                          checked={
                                            lines.length > 0 &&
                                            lines.every((line, index) => selectedItems[getLineKey(requestId, line, index)])
                                          }
                                          aria-label={`Select all items from request ${getRequestNumber(request)}`}
                                          onChange={() => toggleAllRequestItems(request, lines)}
                                        />
                                      </th>
                                      <th>Item Code</th>
                                      <th>Item Name</th>
                                      <th>Quantity</th>
                                      <th>Unit</th>
                                      <th>Warehouse</th>
                                      <th>Required Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((line, lineIndex) => {
                                      const key = getLineKey(requestId, line, lineIndex);
                                      return (
                                        <tr key={key}>
                                          <td className="text-center">
                                            <Form.Check
                                              type="checkbox"
                                              checked={Boolean(selectedItems[key])}
                                              aria-label={`Select ${getValue(line, ['item_name', 'ItemName', 'description'], `item ${lineIndex + 1}`)}`}
                                              onChange={() => toggleItem(request, line, lineIndex)}
                                            />
                                          </td>
                                          <td>{getValue(line, ['item_code', 'ItemCode'], '-')}</td>
                                          <td>{getValue(line, ['item_name', 'ItemName', 'description', 'Dscription'], '-')}</td>
                                          <td>{formatQuantity(getValue(line, ['quantity', 'Quantity']))}</td>
                                          <td>{getValue(line, ['unit', 'UnitMsr', 'UomCode'], '-')}</td>
                                          <td>{getValue(line, ['warehouse', 'WhsCode', 'whs_code'], '-')}</td>
                                          <td>{formatDisplayDate(getValue(line, ['required_date', 'PQTReqDate', 'pqt_req_date']))}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              ) : (
                                <div className="text-center text-muted py-4">No items found for this purchase request.</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      No purchase requests available.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedCount} item selected</span>
          <Button variant="outline-primary" disabled={!selectedCount} onClick={() => setShowSelectedModal(true)}>
            <i className="ti ti-list-details me-1" />
            View Selected Items ({selectedCount})
          </Button>
          <Button variant="outline-secondary" onClick={closeModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showSelectedModal}
        onHide={() => setShowSelectedModal(false)}
        dialogClassName="purchase-quotation-selected-dialog"
        backdropClassName="purchase-quotation-blur-backdrop"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Selected Quotation Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="table-responsive border rounded">
            <Table hover className="purchase-quotation-selected-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Purchase Request</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Warehouse</th>
                  <th>Required Date</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedItemEntries.length ? (
                  selectedItemEntries.map(([key, selected], index) => (
                    <tr key={key}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{selected.requestNumber}</td>
                      <td>{getValue(selected.line, ['item_code', 'ItemCode'], '-')}</td>
                      <td>{getValue(selected.line, ['item_name', 'ItemName', 'description', 'Dscription'], '-')}</td>
                      <td>{formatQuantity(getValue(selected.line, ['quantity', 'Quantity']))}</td>
                      <td>{getValue(selected.line, ['unit', 'UnitMsr', 'UomCode'], '-')}</td>
                      <td>{getValue(selected.line, ['warehouse', 'WhsCode', 'whs_code'], '-')}</td>
                      <td>{formatDisplayDate(getValue(selected.line, ['required_date', 'PQTReqDate', 'pqt_req_date']))}</td>
                      <td className="text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          data-permission-action="none"
                          className="purchase-quotation-remove-selected"
                          aria-label={`Remove ${getValue(selected.line, ['item_name', 'ItemName'], `item ${index + 1}`)}`}
                          onClick={() => removeSelectedItem(key)}
                        >
                          <i className="ti ti-trash" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-5">
                      No items selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedCount} item selected</span>
          <Button variant="outline-secondary" onClick={() => setShowSelectedModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selectedCount} onClick={createQuotation}>
            <i className="ti ti-link me-1" />
            Create Quotation & Public Link
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
