import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';
import MainCard from 'components/MainCard';
import FormDatePicker from 'components/FormDatePicker';
import TablePagination from 'components/TablePagination';
import ApprovalWidgetServices from 'services/setting/ApprovalWidgetServices';
import { getCookies } from 'utils/cookies';
import masterDocumentTypes from 'utils/master_doc_type.json';
import './approval-center-widget.scss';

const PAGE_SIZE = 10;
const documentTypeByCode = new Map(masterDocumentTypes.map((item) => [String(item.object_type), item.description]));
const toApiDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const initialRange = () => {
  const today = new Date();
  return { from: toApiDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toApiDate(today) };
};
const first = (row, keys, fallback = '') =>
  keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;
const asIdList = (value) => {
  if (Array.isArray(value)) return value.flatMap(asIdList);
  if (value && typeof value === 'object') return asIdList(first(value, ['id', 'stage_id', 'code', 'value', 'USERID'], ''));
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};
const getRows = (response) => {
  const root = response?.data?.data ?? response?.data ?? response;
  const payload = root?.Result ?? root?.result ?? root;
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? payload?.documents ?? payload?.items ?? [];
};
const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[T\s])/);
  if (!match) return raw;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    return raw;
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};
const formatAmount = (value, currency) => {
  if (value === undefined || value === null || value === '') return '-';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency || 'IDR', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
};
const getDocumentType = (row) => {
  const objectType = String(first(row, ['ObjType', 'obj_type', 'object_type', 'ObjectCode', 'objectCode'], '')).trim();
  return (
    documentTypeByCode.get(objectType) ||
    first(
      row,
      ['ObjTypeName', 'DocumentTypeName', 'DocumentType', 'document_type'],
      objectType ? `SAP Document (${objectType})` : 'SAP Document'
    )
  );
};
const normalizeDocument = (row) => ({
  id: first(row, ['WddCode', 'wddCode', 'wdd_code', 'DocEntry', 'docEntry', 'id']),
  number: first(row, ['DocNum', 'docNum', 'document_number', 'DraftNum', 'draftNum'], '-'),
  type: getDocumentType(row),
  party: first(row, ['CardName', 'PartnerName', 'Name', 'Remarks', 'Comments'], '-'),
  date: first(row, ['DocDate', 'CreateDate', 'Date', 'date']),
  amount: first(row, ['DocTotal', 'Total', 'TotalAmount', 'amount']),
  currency: first(row, ['DocCur', 'Currency'], 'IDR'),
  status:
    { W: 'PENDING', P: 'PENDING', Y: 'APPROVED', N: 'REJECTED', C: 'CANCELED', G: 'GENERATED' }[
      String(first(row, ['Status', 'DocumentStatus', 'status'], 'PENDING')).toUpperCase()
    ] || String(first(row, ['Status', 'DocumentStatus', 'status'], 'PENDING')).toUpperCase(),
  raw: row
});

export default function ApprovalCenterWidget() {
  const [tab, setTab] = useState('approvals');
  const [range, setRange] = useState(initialRange);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);
  const [decisionStep, setDecisionStep] = useState('remarks');
  const [remarks, setRemarks] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [state, setState] = useState({ loading: true, error: '', documents: [] });
  const requestId = useRef(0);
  const stages = useMemo(() => asIdList(getCookies('approval_stage')), []);
  const originator = useMemo(() => asIdList(getCookies('approval_originator'))[0] || '', []);
  const totalPages = Math.max(1, Math.ceil(state.documents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleDocuments = state.documents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab, range.from, range.to]);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (range.from > range.to) {
      setState({ loading: false, error: 'Start date must not be after end date.', documents: [] });
      return;
    }
    const query = tab === 'approvals' ? stages.join(',') : originator;
    if (!query) {
      setState({ loading: false, error: 'Approval assignment is unavailable. Please sign in again.', documents: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: '' }));
    const params = {
      CustomQuery: query,
      ObjectCode: '',
      From: range.from,
      To: range.to,
      Status: tab === 'approvals' ? 'W' : ''
    };
    if (tab === 'approvals' && originator) params.UserId = originator;
    try {
      const response =
        tab === 'approvals' ? await ApprovalWidgetServices.getApprovals(params) : await ApprovalWidgetServices.getMyDocuments(params);
      if (currentRequest !== requestId.current) return;
      if (response?.data?.success === false) throw new Error(response.data.message || 'Unable to load documents.');
      const rows = getRows(response);
      setState({ loading: false, error: '', documents: (Array.isArray(rows) ? rows : []).map(normalizeDocument) });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setState({ loading: false, error: error?.response?.data?.message || error?.message || 'Unable to load documents.', documents: [] });
    }
  }, [originator, range.from, range.to, stages, tab]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load, revision]);

  const openDecision = (document, status) => {
    setDecision({ document, status });
    setDecisionStep('remarks');
    setRemarks('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setDecisionError('');
  };

  const closeDecision = () => {
    if (submitting) return;
    setDecision(null);
    setPassword('');
    setDecisionError('');
  };

  const submitDecision = async (event) => {
    event.preventDefault();
    if (!decision || !username.trim() || !password || (decision.status === 'N' && !remarks.trim())) return;
    const approvalRequestCode = first(decision.document.raw, ['approvalRequestCode', 'WddCode', 'wddCode', 'wdd_code']);
    if (approvalRequestCode === '' || approvalRequestCode === undefined || approvalRequestCode === null) {
      setDecisionError('Approval request code is missing. Refresh the list and try again.');
      return;
    }
    setSubmitting(true);
    setDecisionError('');
    try {
      const response = await ApprovalWidgetServices.submitDecision({
        approvalRequestCode,
        username: username.trim(),
        password,
        status: decision.status,
        remarks: remarks.trim()
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Unable to update document approval.');
      setDecision(null);
      setPassword('');
      setRevision((value) => value + 1);
    } catch (error) {
      setDecisionError(error?.response?.data?.message || error?.message || 'Unable to submit approval.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MainCard
        className="h-100 sm-dashboard-widget approval-center-widget"
        title={
          <Stack direction="horizontal" gap={2} className="align-items-center justify-content-between">
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <span className="approval-center-widget__icon">
                <i className="ti ti-clipboard-check" />
              </span>
              <span>
                <h5 className="mb-0">Approval Center</h5>
                <small className="text-muted">Review and track your documents</small>
              </span>
            </Stack>
            <Button
              variant="outline-primary"
              size="sm"
              aria-label="Refresh approval widget"
              onClick={() => setRevision((value) => value + 1)}
              disabled={state.loading}
            >
              <i className="ti ti-refresh" />
            </Button>
          </Stack>
        }
      >
        <div className="approval-center-widget__tabs" role="tablist" aria-label="Approval documents">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'approvals'}
            className={tab === 'approvals' ? 'active' : ''}
            onClick={() => setTab('approvals')}
          >
            <i className="ti ti-clipboard-check" /> Approval
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mine'}
            className={tab === 'mine' ? 'active' : ''}
            onClick={() => setTab('mine')}
          >
            <i className="ti ti-file-text" /> My Documents
          </button>
        </div>
        <div className="approval-center-widget__date-fields">
          <div className="approval-center-widget__date-field">
            <span className="approval-center-widget__date-label">Start Date</span>
            <FormDatePicker
              value={range.from}
              clearable={false}
              onChange={(event) => {
                const from = event.target.value;
                if (from) setRange((current) => ({ from, to: from > current.to ? from : current.to }));
              }}
              className="approval-center-widget__date-picker"
              aria-label="Start Date"
            />
          </div>
          <div className="approval-center-widget__date-field">
            <span className="approval-center-widget__date-label">End Date</span>
            <FormDatePicker
              value={range.to}
              clearable={false}
              onChange={(event) => {
                const to = event.target.value;
                if (to) setRange((current) => ({ from: to < current.from ? to : current.from, to }));
              }}
              className="approval-center-widget__date-picker"
              aria-label="End Date"
            />
          </div>
        </div>
        <div className="approval-center-widget__section-title">
          <strong>{tab === 'approvals' ? 'Waiting for you' : 'Recent documents'}</strong>
          {!state.loading && !state.error ? <span>{state.documents.length}</span> : null}
        </div>
        {state.loading ? (
          <div className="approval-center-widget__state">
            <Spinner size="sm" /> Loading documents...
          </div>
        ) : state.error ? (
          <div className="approval-center-widget__empty" role="alert">
            <span className="approval-center-widget__empty-icon is-error">
              <i className="ti ti-cloud-off" />
            </span>
            <strong>Unable to load documents</strong>
            <p>{state.error}</p>
            <Button variant="outline-primary" size="sm" onClick={() => setRevision((value) => value + 1)}>
              <i className="ti ti-refresh me-1" /> Retry
            </Button>
          </div>
        ) : state.documents.length === 0 ? (
          <div className="approval-center-widget__empty">
            <span className="approval-center-widget__empty-icon">
              <i className={tab === 'approvals' ? 'ti ti-circle-check' : 'ti ti-file-search'} />
            </span>
            <strong>{tab === 'approvals' ? 'All caught up' : 'No documents found'}</strong>
            <p>
              {tab === 'approvals'
                ? 'No approvals are waiting for you in this date range.'
                : 'Try choosing a different date range to find your documents.'}
            </p>
          </div>
        ) : (
          <>
            <Table responsive hover className="mb-0 align-middle approval-center-widget__table">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Number</th>
                  <th scope="col">Partner / Step</th>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.map((document, index) => (
                  <tr key={`${document.id}-${index}`}>
                    <td>
                      <span className="approval-center-widget__document-type">
                        <i className="ti ti-file-text" /> {document.type}
                      </span>
                    </td>
                    <td>
                      <strong>#{document.number}</strong>
                    </td>
                    <td className="approval-center-widget__party" title={String(document.party)}>
                      {document.party}
                    </td>
                    <td>{formatDate(document.date)}</td>
                    <td className="approval-center-widget__amount">{formatAmount(document.amount, document.currency)}</td>
                    <td>
                      <span className="approval-center-widget__status" data-status={document.status}>
                        {document.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="approval-center-widget__actions">
                        <Button
                          variant="light-primary"
                          size="sm"
                          className="approval-center-widget__view-button rounded-circle"
                          data-widget-action="view"
                          onClick={() => setSelected(document)}
                          aria-label={`View document ${document.number}`}
                        >
                          <i className="ti ti-chevron-right" />
                        </Button>
                        {tab === 'approvals' && document.status === 'PENDING' ? (
                          <>
                            <Button
                              variant="link"
                              size="sm"
                              className="approval-center-widget__decision-button is-approve rounded-circle"
                              data-widget-action="none"
                              onClick={() => openDecision(document, 'Y')}
                              aria-label={`Approve document ${document.number}`}
                            >
                              <i className="ti ti-check" />
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              className="approval-center-widget__decision-button is-reject rounded-circle"
                              data-widget-action="none"
                              onClick={() => openDecision(document, 'N')}
                              aria-label={`Reject document ${document.number}`}
                            >
                              <i className="ti ti-x" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination
              currentPage={currentPage}
              onPageChange={setPage}
              pageCount={totalPages}
              pageSize={PAGE_SIZE}
              total={state.documents.length}
              itemLabel="documents"
            />
          </>
        )}
      </MainCard>
      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Document #{selected?.number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <dl className="approval-center-widget__detail">
            <dt>Type</dt>
            <dd>{selected?.type}</dd>
            <dt>Status</dt>
            <dd>{selected?.status}</dd>
            <dt>Partner / Step</dt>
            <dd>{selected?.party}</dd>
            <dt>Date</dt>
            <dd>{formatDate(selected?.date)}</dd>
            <dt>Amount</dt>
            <dd>{formatAmount(selected?.amount, selected?.currency)}</dd>
          </dl>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={Boolean(decision)} onHide={closeDecision} centered data-widget-key="approval-center">
        <Form onSubmit={submitDecision}>
          <Modal.Header closeButton={!submitting}>
            <Modal.Title>{decision?.status === 'Y' ? 'Approve Document' : 'Reject Document'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">
              {decisionStep === 'remarks'
                ? `${decision?.status === 'Y' ? 'Enter optional' : 'Enter required'} remarks for document #${decision?.document.number}.`
                : 'Enter your username and password. If you do not have an SAP password, use your Smesta app password.'}
            </p>
            {decisionStep === 'remarks' ? (
              <Form.Group controlId="approval-decision-remarks">
                <Form.Label>Remarks {decision?.status === 'N' ? '*' : '(optional)'}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  maxLength={500}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Enter remarks..."
                  required={decision?.status === 'N'}
                />
                <Form.Text>{remarks.length}/500</Form.Text>
              </Form.Group>
            ) : (
              <>
                <Form.Group controlId="approval-decision-username" className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
                </Form.Group>
                <Form.Group controlId="approval-decision-password">
                  <Form.Label>Password</Form.Label>
                  <div className="approval-center-widget__password-field">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <Button
                      type="button"
                      variant="link"
                      data-widget-action="none"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                    </Button>
                  </div>
                </Form.Group>
              </>
            )}
            {decisionError ? (
              <div className="text-danger mt-3" role="alert">
                {decisionError}
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              data-widget-action="none"
              disabled={submitting}
              onClick={
                decisionStep === 'credentials'
                  ? () => {
                      setDecisionStep('remarks');
                      setDecisionError('');
                    }
                  : closeDecision
              }
            >
              {decisionStep === 'credentials' ? 'Back' : 'Cancel'}
            </Button>
            {decisionStep === 'remarks' ? (
              <Button
                type="button"
                variant={decision?.status === 'Y' ? 'success' : 'danger'}
                data-widget-action="none"
                disabled={decision?.status === 'N' && !remarks.trim()}
                onClick={() => {
                  setDecisionStep('credentials');
                  setDecisionError('');
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                variant={decision?.status === 'Y' ? 'success' : 'danger'}
                data-widget-action="none"
                disabled={submitting || !username.trim() || !password}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : decision?.status === 'Y' ? (
                  'Approve'
                ) : (
                  'Reject'
                )}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
