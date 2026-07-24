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

export default function OrderRetur() {
  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

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

  const openReturnDetail = (index) => {
    setSelectedReturn(filteredReturns[index] || null);
  };

  const closeDetail = () => {
    setSelectedReturn(null);
  };

  const submitReturnAction = async (action) => {
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
    const isApprove = action === 'approve';
    const id = getValue(selectedReturn, ['id'], '');

    showConfirm({
      title: `${isApprove ? 'Approve' : 'Reject'} Return Request`,
      subTitle: `Are you sure you want to ${action} return request #${id || '-'}? This action will update its status.`,
      onConfirm: () => submitReturnAction(action)
    });
  };

  const detailItems = getReturnItems(selectedReturn);
  const selectedPrimaryItem = detailItems[0] || {};

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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetail}>Close</Button>
          <Button variant="danger" onClick={() => confirmReturnAction('reject')}>
            <i className="ti ti-x me-1" /> Reject
          </Button>
          <Button variant="success" onClick={() => confirmReturnAction('approve')}>
            <i className="ti ti-check me-1" /> Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
