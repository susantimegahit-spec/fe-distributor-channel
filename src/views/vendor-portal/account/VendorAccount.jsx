import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Modal } from 'react-bootstrap';

import VendorServices from 'services/vendor-portal/VendorServices';
import { useAlert } from 'utils/alertContext';
import { getVendorPortalSession } from 'utils/vendorPortal';
import VendorDashboardLayout from '../shared/VendorDashboardLayout';

const getValue = (sources, keys, fallback = '-') => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
  }
  return fallback;
};

const getAccountSources = (account) => [account?.account, account?.vendor, account?.user, account?.profile, account];

const createAccountForm = (account) => {
  const sources = getAccountSources(account);
  return {
    company_name: getValue(sources, ['company_name', 'companyName', 'vendor_name', 'vendorName', 'name'], ''),
    company_email: getValue(sources, ['company_email', 'companyEmail', 'email'], ''),
    pic_name: getValue(sources, ['pic_name', 'picName', 'contact_name', 'contactName'], ''),
    pic_phone: getValue(sources, ['pic_phone', 'picPhone', 'phone', 'phone_number', 'phoneNumber'], ''),
    company_npwp: getValue(sources, ['company_npwp', 'companyNpwp', 'npwp'], ''),
    address: getValue(sources, ['address', 'company_address', 'companyAddress'], '')
  };
};

const formatVendorType = (value) => {
  const type = String(value || '').toLowerCase();
  if (type === 'expedition') return 'Expedition';
  if (type === 'distributor') return 'Distributor';
  return value || '-';
};

const formatDocumentLabel = (value) =>
  String(value || 'Document')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDocumentDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDocumentStatusClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (['approved', 'verified', 'valid', 'active'].includes(value)) return 'is-success';
  if (['rejected', 'invalid', 'failed'].includes(value)) return 'is-danger';
  if (['revision', 'needs_revision', 'revised'].includes(value)) return 'is-warning';
  return 'is-pending';
};

export default function VendorAccount() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const session = getVendorPortalSession() || {};
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revisionDocument, setRevisionDocument] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionFile, setRevisionFile] = useState(null);
  const [reuploadingDocument, setReuploadingDocument] = useState(false);
  const [form, setForm] = useState(createAccountForm(null));

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    try {
      const response = await VendorServices.getAccountDetail();
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to load account details.'), { response });
      }
      const accountData = response.data?.data ?? response.data ?? {};
      setAccount(accountData);
      setForm(createAccountForm(accountData));
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || 'Unable to load account details.', 'danger');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const cancelEdit = () => {
    setForm(createAccountForm(account));
    setEditing(false);
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await VendorServices.putAccountDetail(form);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to update account details.'), { response });
      }
      await fetchAccount();
      setEditing(false);
      showAlert(response.data?.message || 'Account details updated successfully.', 'success');
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || 'Unable to update account details.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const openDocumentRevision = (document) => {
    const documentId = document.id ?? document.uuid ?? document.document_id ?? document.documentId;
    if (documentId === undefined || documentId === null || documentId === '') return;
    setRevisionDocument(document);
    setRevisionNotes('');
    setRevisionFile(null);
  };

  const closeDocumentRevision = () => {
    if (reuploadingDocument) return;
    setRevisionDocument(null);
    setRevisionNotes('');
    setRevisionFile(null);
  };

  const submitDocumentRevision = async (event) => {
    event.preventDefault();
    if (!revisionDocument || !revisionNotes.trim() || !revisionFile || reuploadingDocument) return;
    const documentId = revisionDocument.id ?? revisionDocument.uuid ?? revisionDocument.document_id ?? revisionDocument.documentId;
    if (!/\.(pdf|jpe?g|png)$/i.test(revisionFile.name)) {
      showAlert('Document format must be PDF, JPG, or PNG.', 'danger');
      return;
    }
    if (revisionFile.size > 10 * 1024 * 1024) {
      showAlert('Document size cannot exceed 10 MB.', 'danger');
      return;
    }

    setReuploadingDocument(true);
    try {
      const response = await VendorServices.postReuploadDocument(documentId, {
        notes: revisionNotes.trim(),
        file: revisionFile
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to submit document revision.'), { response });
      }
      showAlert(response.data?.message || 'Document revision submitted successfully.', 'success');
      setRevisionDocument(null);
      setRevisionNotes('');
      setRevisionFile(null);
      await fetchAccount();
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || 'Unable to submit document revision.', 'danger');
    } finally {
      setReuploadingDocument(false);
    }
  };

  const details = useMemo(() => {
    const sources = getAccountSources(account);
    return [
      { label: 'Company name', key: 'company_name', value: form.company_name, editable: true },
      { label: 'Vendor type', value: formatVendorType(getValue(sources, ['vendor_type', 'vendorType', 'type'])) },
      { label: 'Email', key: 'company_email', value: form.company_email, editable: true, type: 'email' },
      { label: 'PIC name', key: 'pic_name', value: form.pic_name, editable: true },
      { label: 'Phone number', key: 'pic_phone', value: form.pic_phone, editable: true, type: 'tel' },
      { label: 'NPWP', key: 'company_npwp', value: form.company_npwp, editable: true },
      { label: 'Code', value: getValue(sources, ['sap_vendor_code', 'sapVendorCode', 'vendor_code', 'vendorCode']) },
      { label: 'Status', value: getValue(sources, ['status', 'registration_status', 'registrationStatus']) },
      { label: 'Address', key: 'address', value: form.address, editable: true, wide: true, multiline: true }
    ];
  }, [account, form]);

  const documents = useMemo(() => {
    const sources = getAccountSources(account);
    return sources.map((source) => source?.documents).find(Array.isArray) || [];
  }, [account]);

  const portalName = `${formatVendorType(session.vendorType)} Vendor Portal`;

  return (
    <VendorDashboardLayout portalName={portalName}>
      <div className="vp-account-heading">
        <div className="vp-welcome">
          <span className="vp-kicker">Account</span>
          <h1>Account Details</h1>
          <p>Review your registered vendor information.</p>
        </div>
        <button type="button" className="vp-account-back" onClick={() => navigate(`/vendor-portal/dashboard/${session.vendorType}`)}>
          <i className="ti ti-arrow-left" /> Back to Dashboard
        </button>
      </div>

      <Form className="vp-account-card" onSubmit={saveAccount}>
        {loading ? (
          <div className="vp-account-state">
            <span className="spinner-border" aria-hidden="true" />
            <p>Loading account details...</p>
          </div>
        ) : account ? (
          <>
            <div className="vp-account-actions">
              {editing ? (
                <>
                  <Button type="button" variant="danger" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="ti ti-check" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="primary" onClick={() => setEditing(true)}>
                  <i className="ti ti-edit" /> Edit Account
                </Button>
              )}
            </div>
            <div className={editing ? 'vp-account-grid is-editing' : 'vp-account-grid'}>
              {details.map((detail) => (
                <Form.Group className={detail.wide ? 'vp-account-field vp-account-field-wide' : 'vp-account-field'} key={detail.label}>
                  <Form.Label className={editing ? 'f-12 text-muted mb-1' : 'mb-0'}>{detail.label}</Form.Label>
                  {editing && detail.editable ? (
                    detail.multiline ? (
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={detail.value}
                        onChange={(event) => updateField(detail.key, event.target.value)}
                        required
                      />
                    ) : (
                      <Form.Control
                        type={detail.type || 'text'}
                        value={detail.value}
                        onChange={(event) => updateField(detail.key, event.target.value)}
                        required
                      />
                    )
                  ) : (
                    <strong>{detail.value || '-'}</strong>
                  )}
                </Form.Group>
              ))}
            </div>
            <section className="vp-account-documents">
              <div className="vp-account-section-title">
                <div>
                  <h2>Documents</h2>
                  <p>Legal documents registered with this vendor account.</p>
                </div>
                <span>{documents.length} DOCUMENTS</span>
              </div>
              {documents.length ? (
                <div className="vp-document-grid">
                  {documents.map((document, index) => {
                    const documentId = document.id ?? document.uuid ?? document.document_id ?? document.documentId;
                    const title = getValue(
                      [document],
                      ['document_type', 'documentType', 'type', 'category', 'name', 'document_name'],
                      `Document ${index + 1}`
                    );
                    const fileName = getValue(
                      [document],
                      ['file_name', 'fileName', 'original_name', 'originalName', 'filename'],
                      'File uploaded'
                    );
                    const status = getValue([document], ['status', 'verification_status', 'verificationStatus'], 'Pending');
                    const uploadedAt = getValue(
                      [document],
                      ['uploaded_at', 'uploadedAt', 'created_at', 'createdAt', 'updated_at', 'updatedAt'],
                      ''
                    );

                    return (
                      <article className="vp-document-card" key={document.id ?? document.uuid ?? `${title}-${index}`}>
                        <span className="vp-document-icon">
                          <i className="ti ti-file-description" />
                        </span>
                        <div className="vp-document-copy">
                          <strong>{formatDocumentLabel(title)}</strong>
                          <small title={fileName}>{fileName}</small>
                          <span>Uploaded {formatDocumentDate(uploadedAt)}</span>
                        </div>
                        <span className={`vp-document-status ${getDocumentStatusClass(status)}`}>{formatDocumentLabel(status)}</span>
                        {String(status).trim().toLowerCase() !== 'valid' ? (
                          <button
                            type="button"
                            className="vp-document-upload"
                            disabled={!documentId || reuploadingDocument}
                            title={!documentId ? 'Document ID is unavailable' : 'Submit document revision'}
                            onClick={() => openDocumentRevision(document)}
                          >
                            <i className="ti ti-refresh" />
                            <span>Revision</span>
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="vp-documents-empty">
                  <i className="ti ti-file-off" />
                  <span>No documents are registered for this account.</span>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="vp-account-state">
            <i className="ti ti-alert-circle" />
            <p>Account details could not be loaded.</p>
            <button type="button" onClick={fetchAccount}>
              Try Again
            </button>
          </div>
        )}
      </Form>

      <Modal show={Boolean(revisionDocument)} onHide={closeDocumentRevision} centered>
        <Form onSubmit={submitDocumentRevision}>
          <Modal.Header closeButton={!reuploadingDocument}>
            <Modal.Title>Document Revision</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">
              Upload a revised file for{' '}
              <strong>
                {formatDocumentLabel(
                  getValue(
                    [revisionDocument],
                    ['document_type', 'documentType', 'type', 'category', 'name', 'document_name'],
                    'this document'
                  )
                )}
              </strong>
              .
            </p>
            <div className="d-grid gap-3">
              <Form.Group controlId="document-revision-notes">
                <Form.Label className="f-12 text-muted">Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={revisionNotes}
                  onChange={(event) => setRevisionNotes(event.target.value)}
                  placeholder="Enter revision notes"
                  disabled={reuploadingDocument}
                  required
                />
              </Form.Group>
              <Form.Group controlId="document-revision-file">
                <Form.Label className="f-12 text-muted">Document file</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setRevisionFile(event.target.files?.[0] || null)}
                  disabled={reuploadingDocument}
                  required
                />
                <Form.Text>Accepted formats: PDF, JPG, JPEG, and PNG. Maximum 10 MB.</Form.Text>
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light-secondary" onClick={closeDocumentRevision} disabled={reuploadingDocument}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={reuploadingDocument || !revisionNotes.trim() || !revisionFile}>
              {reuploadingDocument ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> : null}
              {reuploadingDocument ? 'Uploading...' : 'Submit Revision'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </VendorDashboardLayout>
  );
}
