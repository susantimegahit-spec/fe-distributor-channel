import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import OrderServices from '../../../services/customer-portal/OrderServices';
import { useAlert } from '../../../utils/alertContext';
import { useConfirm } from '../../../utils/confirmContext';
import { canUseMenuAction } from '../../../utils/actionPermissions';
import { getCookies } from '../../../utils/cookies';

const getList = (response) => {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload;

  const list = payload?.data || payload?.items || payload?.results || payload?.sales_returns || payload?.salesReturns;
  return Array.isArray(list) ? list : [];
};

const getValue = (item, keys, fallback = '-') => {
  for (const key of keys) {
    const value = key.split('.').reduce((source, path) => source?.[path], item);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

const getStatusColor = (status) => {
  const value = String(status || '').toUpperCase();
  if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(value)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(value)) return 'danger';
  return 'warning';
};

const getReturnItems = (item) => {
  const items = getValue(item, ['items', 'details', 'return_items', 'returnItems'], []);
  if (Array.isArray(items) && items.length) return items;

  return getValue(item, ['item_code', 'itemCode', 'ItemCode'], '') ? [item] : [];
};

const formatReturnDate = (value) => {
  const compactDate = moment(String(value || ''), 'YYYYMMDD', true);
  if (compactDate.isValid()) return compactDate.format('DD MMM YYYY');

  const parsedDate = moment(value);
  return parsedDate.isValid() ? parsedDate.format('DD MMM YYYY') : '-';
};

const formatQuantity = (value) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  }).format(Number(value) || 0);

const normalizeAccessValue = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

export default function OrderRetur() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const roleId = Number(getCookies('role'));
  const isAdminSales = roleId === 2;
  const isFinance = roleId === 3;
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      try {
        const response = await OrderServices.getRetur();
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch return data');
        setReturns(getList(response));
      } catch (error) {
        setReturns([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch return data', 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, [showAlert]);

  const filteredReturns = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    if (!search) return returns;

    return returns.filter((item) => {
      const primaryItem = getReturnItems(item)[0] || {};

      return [
        getValue(item, ['id'], ''),
        getValue(item, ['sales_order_no'], ''),
        getValue(item, ['do_num', 'do_number', 'doNum', 'doNumber'], ''),
        getValue(primaryItem, ['item_code', 'itemCode', 'ItemCode'], ''),
        getValue(primaryItem, ['item_description', 'itemDescription', 'item_name', 'itemName'], ''),
        getValue(item, ['reason'], ''),
        getValue(item, ['status', 'return_status', 'returnStatus'], '')
      ].some((value) => String(value).toLowerCase().includes(search));
    });
  }, [keyword, returns]);

  const detailItems = getReturnItems(selectedReturn);
  const selectedPrimaryItem = detailItems[0] || {};
  const returnAttachmentsValue = getValue(selectedReturn, ['sales_return.attachments', 'salesReturn.attachments', 'attachments'], []);
  const returnAttachments = Array.isArray(returnAttachmentsValue)
    ? returnAttachmentsValue
    : [returnAttachmentsValue].filter(Boolean);
  const selectedReturnStatus = normalizeAccessValue(
    getValue(selectedReturn, ['status', 'return_status', 'returnStatus'], '')
  );
  const canManageSelectedReturn =
    canUseMenuAction(['order-retur', 15], 'approve') &&
    ['WAITING_ADMIN_SALES', 'WAITING_FINANCE'].includes(selectedReturnStatus) &&
    !(isAdminSales && selectedReturnStatus === 'WAITING_FINANCE') &&
    !(isFinance && selectedReturnStatus === 'WAITING_ADMIN_SALES');

  const openReturnDetail = (index) => {
    setSelectedReturn(filteredReturns[index] || null);
  };

  const closeDetail = () => {
    setSelectedReturn(null);
    setPreviewAttachment(null);
  };

  const getAttachmentValue = (attachment, keys, fallback = '') => {
    if (typeof attachment === 'string') return attachment;
    return getValue(attachment, keys, fallback);
  };

  const getAttachmentName = (attachment) =>
    getAttachmentValue(attachment, ['file_name', 'original_name', 'name', 'filename'], 'Attachment');

  const getAttachmentUrl = (attachment) => {
    const rawUrl = getAttachmentValue(
      attachment,
      ['file_url', 'url', 'path', 'file_path', 'document_url', 'attachment_url'],
      ''
    );

    if (!rawUrl || rawUrl === '-') return '';
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    try {
      return new URL(rawUrl, import.meta.env.VITE_APP_API_ENDPOINT_PRODUCTION).href;
    } catch {
      return rawUrl;
    }
  };

  const getAttachmentType = (attachment) => {
    const fileName = getAttachmentName(attachment);
    const mimeType = String(getAttachmentValue(attachment, ['file_type', 'mime_type', 'mimeType', 'type'], '')).toLowerCase();
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension) || mimeType.includes('word')) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(extension) || mimeType.includes('sheet') || mimeType.includes('excel')) return 'excel';
    return 'file';
  };

  const getAttachmentIcon = (attachment) => {
    const type = getAttachmentType(attachment);
    if (type === 'pdf') return 'ti ti-file-type-pdf text-danger';
    if (type === 'word') return 'ti ti-file-type-doc text-primary';
    if (type === 'excel') return 'ti ti-file-spreadsheet text-success';
    return 'ti ti-file text-secondary';
  };

  const openAttachment = (attachment) => {
    const url = getAttachmentUrl(attachment);
    if (!url) {
      showAlert('Attachment URL not found', 'danger');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAttachmentClick = (attachment) => {
    if (['image', 'pdf'].includes(getAttachmentType(attachment))) {
      setPreviewAttachment(attachment);
      return;
    }

    openAttachment(attachment);
  };

  const submitReturnAction = async (action) => {
    if (!canManageSelectedReturn) {
      showAlert('You do not have access to process this return status', 'danger');
      return;
    }

    const id = getValue(selectedReturn, ['id'], '');
    const actionLabel = action === 'approve' ? 'approved' : 'rejected';
    if (!id) {
      showAlert('Return ID not found', 'danger');
      return;
    }

    try {
      const response = action === 'approve' ? await OrderServices.postApprove(id) : await OrderServices.postReject(id);
      if (response?.status >= 400 || response?.data?.success === false) {
        throw new Error(response.data.message || `Failed to ${action} return request`);
      }

      const responseItem = response?.data?.data;
      const nextStatus = getValue(responseItem, ['status', 'return_status', 'returnStatus'], actionLabel.toUpperCase());
      const updatedReturn = {
        ...selectedReturn,
        ...(responseItem && typeof responseItem === 'object' && !Array.isArray(responseItem) ? responseItem : {}),
        status: nextStatus
      };

      setReturns((currentReturns) =>
        currentReturns.map((item) => (String(getValue(item, ['id'], '')) === String(id) ? updatedReturn : item))
      );
      setSelectedReturn(updatedReturn);
      showAlert(response?.data?.message || `Return request ${actionLabel} successfully`, 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || `Failed to ${action} return request`, 'danger');
    }
  };

  const confirmReturnAction = (action) => {
    if (!canManageSelectedReturn) {
      showAlert('You do not have access to process this return status', 'danger');
      return;
    }

    const isApprove = action === 'approve';
    const id = getValue(selectedReturn, ['id'], '');

    showConfirm({
      title: `${isApprove ? 'Approve' : 'Reject'} Return Request`,
      subTitle: `Are you sure you want to ${action} return request #${id || '-'}? This action will update its status.`,
      onConfirm: () => submitReturnAction(action)
    });
  };

  return (
    <>
      <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Retur</h5>
          <span className="text-muted f-12">Sales order return requests.</span>
        </Stack>
      }
    >
      <Form.Control
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Search SO, DO, item, reason, or status..."
        className="mb-3"
      />
      <Table responsive hover bordered className="mb-0 align-middle">
        <thead>
          <tr>
            <th>No.</th>
            <th>NO.SO</th>
            <th>No. DO</th>
            <th>Item</th>
            <th className="text-end">DO Qty</th>
            <th className="text-end">Return Qty</th>
            <th>Reason</th>
            <th>Date</th>
            <th>Status</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} className="text-center text-muted py-4">Loading return data...</td></tr>
          ) : filteredReturns.length ? (
            filteredReturns.map((item, index) => {
              const status = getValue(item, ['status', 'return_status', 'returnStatus'], 'Pending');
              const primaryItem = getReturnItems(item)[0] || {};
              const date = getValue(item, ['created_at', 'createdAt', 'request_date', 'requestDate'], '');

              return (
                <tr key={getValue(item, ['id'], index)}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">
                    {getValue(item, ['sales_order_no'])}
                  </td>
                  <td className="fw-semibold">{getValue(item, ['do_num', 'do_number', 'doNum', 'doNumber'])}</td>
                  <td>
                    <div className="fw-semibold">
                      {getValue(primaryItem, ['item_code', 'itemCode', 'ItemCode'])}
                    </div>
                    <small className="text-muted">
                      {getValue(
                        primaryItem,
                        [
                          'sales_order_detail.item_name',
                          'salesOrderDetail.itemName',
                          'item_name',
                          'itemName',
                          'item_description',
                          'itemDescription'
                        ],
                        getValue(item, [
                          'sales_order_detail.item_name',
                          'salesOrderDetail.itemName',
                          'item_name',
                          'itemName',
                          'item_description',
                          'itemDescription'
                        ])
                      )}
                    </small>
                  </td>
                  <td className="text-end">
                    {formatQuantity(
                      getValue(
                        primaryItem,
                        ['do_quantity', 'delivered_quantity', 'deliveredQuantity'],
                        getValue(item, ['do_quantity'], 0)
                      )
                    )}
                  </td>
                  <td className="text-end fw-semibold">{formatQuantity(getValue(primaryItem, ['quantity', 'qty'], 0))}</td>
                  <td className="text-wrap">{getValue(item, ['reason'])}</td>
                  <td>{formatReturnDate(date)}</td>
                  <td><Badge bg={getStatusColor(status)}>{String(status).replace(/_/g, ' ')}</Badge></td>
                  <td className="text-center">
                    <Button
                      className="rounded-circle"
                      variant="outline-primary"
                      size="sm"
                      title="View return detail"
                      aria-label="View return detail"
                      onClick={() => openReturnDetail(index)}
                    >
                      <i className="ti ti-eye" />
                    </Button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={10} className="text-center text-muted py-4">No return data found.</td></tr>
          )}
        </tbody>
      </Table>
      </MainCard>

      <Modal show={Boolean(selectedReturn)} onHide={closeDetail} size="xl" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Return Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col sm={6} lg>
              <small className="text-muted">NO.SO</small>
              <div className="fw-semibold">
                {getValue(selectedReturn, ['sales_order_no'])}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">No. Delivery Order</small>
              <div className="fw-semibold">
                {getValue(
                  selectedReturn,
                  ['do_num', 'do_number', 'doNum', 'doNumber'],
                  getValue(selectedPrimaryItem, ['do_num', 'do_number', 'doNum', 'doNumber'])
                )}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">DO Date</small>
              <div className="fw-semibold">
                {formatReturnDate(
                  getValue(selectedReturn, ['do_date', 'doDate'], getValue(selectedPrimaryItem, ['do_date', 'doDate'], ''))
                )}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">Baseline</small>
              <div className="fw-semibold">
                {getValue(
                  selectedReturn,
                  ['baseline', 'base_line', 'baseLine'],
                  getValue(selectedPrimaryItem, ['baseline', 'base_line', 'baseLine'])
                )}
              </div>
            </Col>
            <Col sm={6} lg>
              <small className="text-muted">Status</small>
              <div>
                <Badge bg={getStatusColor(getValue(selectedReturn, ['status', 'return_status', 'returnStatus'], 'Pending'))}>
                  {String(getValue(selectedReturn, ['status', 'return_status', 'returnStatus'], 'Pending')).replace(/_/g, ' ')}
                </Badge>
              </div>
            </Col>
            <Col xs={12}>
              <small className="text-muted">Reason</small>
              <div className="border rounded bg-light p-3">{getValue(selectedReturn, ['reason'])}</div>
            </Col>
          </Row>

          {detailItems.length ? (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th className="text-end">DO Quantity</th>
                  <th className="text-end">Return Quantity</th>
                </tr>
              </thead>
              <tbody>
                {detailItems.map((item, index) => {
                  const itemCode = getValue(item, ['item_code', 'itemCode', 'ItemCode']);

                  return (
                    <tr key={`${itemCode}-${index}`}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{itemCode}</td>
                      <td>
                        {getValue(item, [
                          'sales_order_detail.item_name',
                          'salesOrderDetail.itemName',
                          'item_name',
                          'itemName',
                          'item_description',
                          'itemDescription',
                          'description'
                        ])}
                      </td>
                      <td className="text-end">
                        {formatQuantity(getValue(item, ['do_quantity', 'delivered_quantity', 'deliveredQuantity'], 0))}
                      </td>
                      <td className="text-end fw-semibold">{formatQuantity(getValue(item, ['quantity', 'qty'], 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">No product detail found.</div>
          )}

          {returnAttachments.length ? (
            <div className="mt-4">
              <Stack direction="horizontal" className="justify-content-between mb-3">
                <div>
                  <h6 className="mb-1">Return Attachments</h6>
                  <small className="text-muted">Click an attachment to preview the file.</small>
                </div>
                <Badge bg="primary">{returnAttachments.length} files</Badge>
              </Stack>
              <Row className="g-3">
                {returnAttachments.map((attachment, index) => {
                  const attachmentUrl = getAttachmentUrl(attachment);
                  const attachmentName = getAttachmentName(attachment);
                  const attachmentType = getAttachmentType(attachment);

                  return (
                    <Col xs={6} sm={4} md={3} key={attachment.id || `${attachmentName}-${index}`}>
                      <Button
                        variant="light"
                        className="border w-100 h-100 p-2 text-start"
                        onClick={() => handleAttachmentClick(attachment)}
                        disabled={!attachmentUrl}
                        title={`Preview ${attachmentName}`}
                      >
                        <span
                          className="d-flex align-items-center justify-content-center overflow-hidden rounded bg-light mb-2"
                          style={{ height: 112 }}
                        >
                          {attachmentType === 'image' ? (
                            <img
                              src={attachmentUrl}
                              alt={attachmentName}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <i className={`${getAttachmentIcon(attachment)} f-40`} />
                          )}
                        </span>
                        <span className="d-block text-truncate fw-semibold f-12">{attachmentName}</span>
                        <span className="d-block text-muted text-uppercase" style={{ fontSize: 10 }}>
                          {attachmentType}
                        </span>
                      </Button>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetail}>Close</Button>
          {canManageSelectedReturn && (
            <>
              <Button variant="danger" onClick={() => confirmReturnAction('reject')}>
                <i className="ti ti-x me-1" /> Reject
              </Button>
              <Button variant="success" onClick={() => confirmReturnAction('approve')}>
                <i className="ti ti-check me-1" /> Approve
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(previewAttachment)} onHide={() => setPreviewAttachment(null)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{previewAttachment ? getAttachmentName(previewAttachment) : 'Attachment Preview'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-light">
          {previewAttachment && getAttachmentType(previewAttachment) === 'image' ? (
            <div className="d-flex align-items-center justify-content-center p-3" style={{ minHeight: 420 }}>
              <img
                src={getAttachmentUrl(previewAttachment)}
                alt={getAttachmentName(previewAttachment)}
                className="img-fluid"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          ) : previewAttachment ? (
            <iframe
              src={getAttachmentUrl(previewAttachment)}
              title={getAttachmentName(previewAttachment)}
              className="border-0 w-100"
              style={{ minHeight: '70vh' }}
            />
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setPreviewAttachment(null)}>
            Close
          </Button>
          {previewAttachment ? (
            <Button variant="primary" onClick={() => openAttachment(previewAttachment)}>
              <i className="ti ti-external-link me-1" />
              Open in New Tab
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>
    </>
  );
}
