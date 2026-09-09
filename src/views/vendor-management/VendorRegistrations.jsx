import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Overlay from 'react-bootstrap/Overlay';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import VendorManagementServices from 'services/vendor-management/VendorManagementServices';
import { useAlert } from 'utils/alertContext';

const pageSize = 10;
const documentLabels = {
  akta: 'Deed of Incorporation (Akta Perusahaan)',
  nib: 'Business Identification Number (NIB)',
  npwp: 'Company Tax ID (NPWP)',
  support: 'Supporting Document'
};

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

const formatDate = (value) => {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const statusVariant = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['approved', 'active', 'verified'].includes(normalized)) return 'success';
  if (['rejected', 'inactive'].includes(normalized)) return 'danger';
  if (['pending', 'submitted', 'review'].includes(normalized)) return 'warning';
  return 'secondary';
};

const getDetail = (response) => response?.data?.data ?? response?.data ?? null;

const getDocuments = (vendor) => {
  const documents = vendor?.documents;
  if (Array.isArray(documents)) return documents.filter(Boolean);
  if (!documents || typeof documents !== 'object') return [];

  return Object.entries(documents).map(([key, document]) =>
    document && typeof document === 'object' ? { key, ...document } : { key, url: document }
  );
};

const getDocumentUrl = (document) => {
  if (typeof document === 'string') return document;
  if (!document || typeof document !== 'object') return '';
  return document.url ?? document.file_url ?? document.path ?? document.download_url ?? '';
};

const getDocumentId = (document) => {
  if (!document || typeof document !== 'object') return null;
  return document.document_id ?? document.id ?? document.uuid ?? null;
};

const getDocumentType = (document) => String(document?.document_type ?? document?.type ?? document?.key ?? '').toLowerCase();

const getDocumentLabel = (document) => {
  const type = getDocumentType(document);
  return documentLabels[type] || document?.label || document?.document_name || document?.name || type || 'Document';
};

const getDocumentFileName = (document) =>
  document?.file_name ?? document?.original_name ?? document?.filename ?? (getDocumentUrl(document) ? 'Document available' : 'Document');

const getDocumentStatus = (document) => document?.status ?? document?.verification_status ?? 'Pending';

export default function VendorRegistrations({
  title = 'Vendor Registrations',
  subheader = 'Review companies that have registered through the Vendor Portal.'
}) {
  const { showAlert } = useAlert();
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewingDocumentId, setPreviewingDocumentId] = useState(null);
  const [documentActionMenu, setDocumentActionMenu] = useState(null);
  const [revisionDocument, setRevisionDocument] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [registrationAction, setRegistrationAction] = useState(null);
  const [approveForm, setApproveForm] = useState({ legal_notes: '', sap_vendor_code: '', initial_password: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingRegistrationAction, setSubmittingRegistrationAction] = useState(false);

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

  const showVendorDetail = async (id) => {
    if (!id) return;
    setVendorDetail(null);
    setDetailLoading(true);
    try {
      const response = await VendorManagementServices.getDetailVendor(id);
      if (!(response?.status >= 200 && response.status < 300)) {
        throw Object.assign(new Error('Unable to load vendor details.'), { response });
      }
      setVendorDetail(getDetail(response));
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || 'Unable to load vendor details.', 'danger');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeVendorDetail = () => {
    if (detailLoading) return;
    setDocumentActionMenu(null);
    setVendorDetail(null);
  };

  const openRegistrationAction = (type) => {
    const id = vendorDetail?.id ?? vendorDetail?.uuid ?? vendorDetail?.vendor_id;
    if (id === undefined || id === null || id === '') return;
    setApproveForm({ legal_notes: '', sap_vendor_code: '', initial_password: '' });
    setRejectionReason('');
    setRegistrationAction({ type, id, company: getValue(vendorDetail, ['company_name', 'name']) });
    if (type !== 'reject') closeVendorDetail();
  };

  const closeRegistrationAction = () => {
    if (submittingRegistrationAction) return;
    setRegistrationAction(null);
  };

  const submitRegistrationAction = async (event) => {
    event.preventDefault();
    if (!registrationAction || submittingRegistrationAction) return;
    setSubmittingRegistrationAction(true);
    try {
      const response =
        registrationAction.type === 'approve'
          ? await VendorManagementServices.postApproveVendor(registrationAction.id, approveForm)
          : await VendorManagementServices.postRejectVendor(registrationAction.id, { rejection_reason: rejectionReason.trim() });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error(`Unable to ${registrationAction.type} vendor.`), { response });
      }
      showAlert(
        response?.data?.message || `Vendor ${registrationAction.type === 'approve' ? 'approved' : 'rejected'} successfully.`,
        'success'
      );
      setRegistrationAction(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || `Unable to ${registrationAction.type} vendor.`, 'danger');
    } finally {
      setSubmittingRegistrationAction(false);
    }
  };

  const previewDocument = async (documentId) => {
    if (!documentId || previewingDocumentId) return;
    setPreviewingDocumentId(documentId);
    try {
      const response = await VendorManagementServices.getPreviewDocument(documentId);
      if (!(response?.status >= 200 && response.status < 300) || !(response.data instanceof Blob)) {
        throw Object.assign(new Error('Unable to preview document.'), { response });
      }
      const previewUrl = URL.createObjectURL(response.data);
      const previewWindow = window.open(previewUrl, '_blank');
      if (!previewWindow) {
        URL.revokeObjectURL(previewUrl);
        showAlert('Please allow pop-ups to preview this document.', 'warning');
        return;
      }
      previewWindow.opener = null;
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
    } catch (error) {
      let responseData = error.response?.data;
      if (responseData instanceof Blob) {
        try {
          responseData = JSON.parse(await responseData.text());
        } catch {
          responseData = null;
        }
      }
      showAlert(responseData?.message || error.message || 'Unable to preview document.', 'danger');
    } finally {
      setPreviewingDocumentId(null);
    }
  };

  const openDocumentRevision = (document) => {
    const documentId = getDocumentId(document);
    if (!documentId) return;
    setDocumentActionMenu(null);
    setRevisionReason('');
    setRevisionDocument({ id: documentId, label: getDocumentLabel(document) });
  };

  const closeDocumentRevision = () => {
    if (submittingRevision) return;
    setRevisionDocument(null);
  };

  const submitDocumentRevision = async (event) => {
    event.preventDefault();
    if (!revisionDocument || !revisionReason.trim() || submittingRevision) return;
    setSubmittingRevision(true);
    try {
      const response = await VendorManagementServices.postRevisionDocument(revisionDocument.id, {
        revision_reason: revisionReason.trim()
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to request document revision.'), { response });
      }
      showAlert(response?.data?.message || 'Document revision requested successfully.', 'success');
      setRevisionDocument(null);
      setRefreshKey((value) => value + 1);
      const vendorId = vendorDetail?.id ?? vendorDetail?.uuid ?? vendorDetail?.vendor_id;
      if (vendorId) await showVendorDetail(vendorId);
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || 'Unable to request document revision.', 'danger');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasRows = registrations.length > 0;
  const detailDocuments = getDocuments(vendorDetail);
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
      title={title}
      subheader={subheader}
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
            <th>Documents</th>
            <th>Registered at</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="py-5 text-center text-muted">
                <Spinner size="sm" className="me-2" /> Loading vendor registrations...
              </td>
            </tr>
          ) : null}
          {!loading && hasRows
            ? registrations.map((vendor, index) => {
                const status = getValue(vendor, ['status', 'registration_status'], 'Pending');
                const vendorId = vendor?.id ?? vendor?.uuid ?? vendor?.vendor_id;
                return (
                  <tr key={vendorId ?? index}>
                    <td>
                      <Button
                        variant="link"
                        className="d-flex flex-column align-items-start p-0 text-start"
                        onClick={() => showVendorDetail(vendorId)}
                        disabled={!vendorId}
                      >
                        <strong>{getValue(vendor, ['company_name', 'name'])}</strong>
                        <small className="text-muted">{getValue(vendor, ['company_email', 'email'])}</small>
                      </Button>
                    </td>
                    <td className="text-capitalize">{getValue(vendor, ['vendor_type', 'type'])}</td>
                    <td>
                      <span className="d-block">{getValue(vendor, ['pic_name', 'contact_name'])}</span>
                      <small className="text-muted">{getValue(vendor, ['pic_phone', 'phone'])}</small>
                    </td>
                    <td>
                      <Badge bg="light-primary" text="primary">
                        {getDocuments(vendor).length} documents
                      </Badge>
                    </td>
                    <td>{formatDate(getValue(vendor, ['registered_at', 'created_at']))}</td>
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
              <td colSpan={6} className="py-5 text-center text-muted">
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

      <Modal
        dialogClassName="vendor-detail-dialog"
        show={detailLoading || Boolean(vendorDetail)}
        onHide={closeVendorDetail}
        centered
        scrollable
      >
        <Modal.Header closeButton={!detailLoading}>
          <Modal.Title>Vendor registration details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading ? (
            <div className="py-5 text-center text-muted">
              <Spinner size="sm" className="me-2" /> Loading vendor details...
            </div>
          ) : vendorDetail ? (
            <div className="row g-4">
              <div className="col-md-8">
                <small className="text-muted d-block mb-1">Company</small>
                <h5 className="mb-1">{getValue(vendorDetail, ['company_name', 'name'])}</h5>
                <span className="text-muted">{getValue(vendorDetail, ['company_email', 'email'])}</span>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block mb-1">Status</small>
                {(() => {
                  const status = getValue(vendorDetail, ['status', 'registration_status'], 'Pending');
                  return (
                    <Badge bg={`light-${statusVariant(status)}`} text={statusVariant(status)} className="text-capitalize">
                      {status}
                    </Badge>
                  );
                })()}
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Vendor type</small>
                <span className="text-capitalize">{getValue(vendorDetail, ['vendor_type', 'type'])}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Company NPWP</small>
                <span>{getValue(vendorDetail, ['company_npwp', 'npwp_number'])}</span>
              </div>
              <div className="col-12">
                <small className="text-muted d-block">Company address</small>
                <span>{getValue(vendorDetail, ['address', 'company_address'])}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Contact person</small>
                <span>{getValue(vendorDetail, ['pic_name', 'contact_name'])}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Phone number</small>
                <span>{getValue(vendorDetail, ['pic_phone', 'phone'])}</span>
              </div>
              <div className="col-12">
                <small className="text-muted d-block">Registered at</small>
                <span>{formatDate(getValue(vendorDetail, ['registered_at', 'created_at']))}</span>
              </div>
              <div className="col-12">
                <hr className="my-1" />
                <h6 className="mb-3">Legal documents</h6>
                <div className="row g-3">
                  {detailDocuments.length ? (
                    detailDocuments.map((document, index) => {
                      const documentId = getDocumentId(document);
                      const label = getDocumentLabel(document);
                      const status = getDocumentStatus(document);
                      const documentKey = documentId ?? `${getDocumentType(document)}-${index}`;
                      const isPreviewing = documentId != null && previewingDocumentId === documentId;
                      const isActionOpen = documentActionMenu?.key === documentKey;
                      return (
                        <div className="col-12 col-lg-6" key={documentKey}>
                          <div className="border rounded p-3 h-100 d-flex flex-column gap-3">
                            <div className="d-flex align-items-start gap-2">
                              <i className="ti ti-file-description f-22 text-primary flex-shrink-0" aria-hidden="true" />
                              <div className="text-break">
                                <strong className="d-block">{label}</strong>
                                <small className="text-muted d-block mt-1">{getDocumentFileName(document)}</small>
                              </div>
                            </div>
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-auto">
                              <Badge bg={`light-${statusVariant(status)}`} text={statusVariant(status)} className="text-capitalize">
                                {status}
                              </Badge>
                              <Button
                                size="sm"
                                variant={isActionOpen ? 'primary' : 'outline-primary'}
                                aria-label={`Open actions for ${label}`}
                                aria-expanded={isActionOpen}
                                aria-haspopup="true"
                                data-permission-action="none"
                                disabled={Boolean(previewingDocumentId)}
                                onClick={(event) =>
                                  setDocumentActionMenu(isActionOpen ? null : { key: documentKey, document, target: event.currentTarget })
                                }
                              >
                                {isPreviewing ? (
                                  <Spinner size="sm" className="me-1" />
                                ) : (
                                  <i className="ti ti-dots-vertical me-1" aria-hidden="true" />
                                )}
                                Actions <i className="ti ti-chevron-down ms-1" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-12">
                      <div className="border rounded py-4 text-center text-muted">No documents available.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" data-permission-action="none" onClick={closeVendorDetail} disabled={detailLoading}>
            Close
          </Button>
          <Button variant="outline-danger" data-permission-action="approve" onClick={() => openRegistrationAction('reject')}>
            <i className="ti ti-x me-1" aria-hidden="true" /> Reject
          </Button>
          <Button variant="success" data-permission-action="approve" onClick={() => openRegistrationAction('approve')}>
            <i className="ti ti-check me-1" aria-hidden="true" /> Approve
          </Button>
        </Modal.Footer>
        <Overlay
          show={Boolean(documentActionMenu)}
          target={documentActionMenu?.target}
          placement="top-end"
          containerPadding={8}
          rootClose
          rootCloseEvent="mousedown"
          onHide={() => setDocumentActionMenu(null)}
        >
          {({ ref, style, placement }) => {
            const selectedDocument = documentActionMenu?.document;
            const documentId = getDocumentId(selectedDocument);
            return (
              <div
                ref={ref}
                className="dropdown-menu show"
                data-popper-placement={placement}
                style={{ ...style, zIndex: 1080, minWidth: 180 }}
              >
                <button
                  type="button"
                  className="dropdown-item"
                  data-permission-action="none"
                  disabled={!documentId || Boolean(previewingDocumentId)}
                  onClick={() => {
                    setDocumentActionMenu(null);
                    previewDocument(documentId);
                  }}
                >
                  <i className="ti ti-eye text-primary me-2" aria-hidden="true" /> View
                </button>
                <button type="button" className="dropdown-item" disabled>
                  <i className="ti ti-circle-check text-success me-2" aria-hidden="true" /> Verify
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  data-permission-action="approve"
                  disabled={!documentId}
                  onClick={() => openDocumentRevision(selectedDocument)}
                >
                  <i className="ti ti-edit text-warning me-2" aria-hidden="true" /> Revision
                </button>
              </div>
            );
          }}
        </Overlay>
      </Modal>

      <Modal show={Boolean(revisionDocument)} onHide={closeDocumentRevision} centered>
        <Form onSubmit={submitDocumentRevision}>
          <Modal.Header closeButton={!submittingRevision}>
            <Modal.Title>Request document revision</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">Provide the revision reason for {revisionDocument?.label}.</p>
            <Form.Group>
              <Form.Label>Revision reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={revisionReason}
                onChange={(event) => setRevisionReason(event.target.value)}
                disabled={submittingRevision}
                placeholder="Enter the required document revision"
                autoFocus
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" data-permission-action="none" onClick={closeDocumentRevision} disabled={submittingRevision}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="warning"
              data-permission-action="approve"
              disabled={submittingRevision || !revisionReason.trim()}
            >
              {submittingRevision ? <Spinner size="sm" className="me-2" aria-hidden="true" /> : null}
              Submit revision
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(registrationAction)} onHide={closeRegistrationAction} centered>
        <Form onSubmit={submitRegistrationAction}>
          <Modal.Header closeButton={!submittingRegistrationAction}>
            <Modal.Title>{registrationAction?.type === 'approve' ? 'Approve vendor' : 'Reject vendor'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">
              {registrationAction?.type === 'approve'
                ? `Complete the approval information for ${registrationAction?.company}.`
                : `Provide the rejection reason for ${registrationAction?.company}.`}
            </p>
            {registrationAction?.type === 'approve' ? (
              <div className="d-grid gap-3">
                <Form.Group>
                  <Form.Label>SAP vendor code</Form.Label>
                  <Form.Control
                    value={approveForm.sap_vendor_code}
                    onChange={(event) => setApproveForm((current) => ({ ...current, sap_vendor_code: event.target.value }))}
                    disabled={submittingRegistrationAction}
                    placeholder="Enter SAP vendor code"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Initial password</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={approveForm.initial_password}
                    onChange={(event) => setApproveForm((current) => ({ ...current, initial_password: event.target.value }))}
                    disabled={submittingRegistrationAction}
                    placeholder="Enter initial password"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Legal notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={approveForm.legal_notes}
                    onChange={(event) => setApproveForm((current) => ({ ...current, legal_notes: event.target.value }))}
                    disabled={submittingRegistrationAction}
                    placeholder="Enter legal notes"
                  />
                </Form.Group>
              </div>
            ) : (
              <Form.Group>
                <Form.Label>Rejection reason</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  disabled={submittingRegistrationAction}
                  placeholder="Enter the reason for rejecting this vendor"
                  required
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="light-secondary"
              data-permission-action="none"
              onClick={closeRegistrationAction}
              disabled={submittingRegistrationAction}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={registrationAction?.type === 'approve' ? 'success' : 'danger'}
              data-permission-action="approve"
              disabled={submittingRegistrationAction || (registrationAction?.type === 'reject' && !rejectionReason.trim())}
            >
              {submittingRegistrationAction ? <Spinner size="sm" className="me-2" aria-hidden="true" /> : null}
              {registrationAction?.type === 'approve' ? 'Approve vendor' : 'Reject vendor'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainCard>
  );
}
