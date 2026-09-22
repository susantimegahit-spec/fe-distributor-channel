import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Modal, Stack } from 'react-bootstrap';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import { useAlert } from '../../../utils/alertContext';

export default function RescheduleOrderActions({ order, onSuccess, expanded = false }) {
  const { showAlert } = useAlert();
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ loading: '', eta: '', notes: '' });
  const id = order.requested_order_id ?? order.id ?? order.sales_order_id;
  const number = order.sap_doc_num || order.doc_num || order.order_no || id;
  const logisticStatus = String(order.logistic_status ?? order.logisticStatus ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  const actionsCompleted = ['APPROVED', 'RESCHEDULE_APPROVED'].includes(logisticStatus);
  const openReschedule = () => {
    setForm({ loading: String(order.doc_due_date || '').slice(0, 10), eta: String(order.eta_date || '').slice(0, 10), notes: '' });
    setAction('reschedule');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving || !id) return;
    if (action === 'reschedule' && (!form.loading || !form.notes.trim())) return;
    setSaving(true);
    try {
      const response = action === 'approve'
        ? await LogisticsServices.postApproveOrdersPacking(id)
        : await LogisticsServices.postRescheduleOrder(id, {
            proposed_delivery_date: form.loading,
            ...(form.eta ? { proposed_eta_date: form.eta } : {}),
            notes: form.notes.trim()
          });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw new Error(response?.data?.message || 'Unable to process order');
      }
      showAlert(response?.data?.message || 'Order updated successfully', 'success');
      setAction(null);
      onSuccess();
    } catch (error) {
      showAlert(error?.response?.data?.message || error.message || 'Unable to process order', 'danger');
    } finally {
      setSaving(false);
    }
  };
  if (actionsCompleted) return null;

  return (
    <>
      <Stack direction="horizontal" gap={expanded ? 2 : 1} className="justify-content-end flex-wrap">
        <Button size={expanded ? undefined : 'sm'} variant={expanded ? 'success' : 'outline-success'}
          className={expanded ? 'px-4 py-2 rounded-3 fw-semibold' : 'logistics-order-action logistics-order-action--confirm'}
          title="Approve for Packing" aria-label={`Approve order ${number}`} disabled={!id || saving} onClick={() => setAction('approve')}>
          <i className={`ti ti-check${expanded ? ' me-2' : ''}`} />
          {expanded && 'Approve'}
        </Button>
        <Button size={expanded ? undefined : 'sm'} variant="outline-danger"
          className={expanded ? 'px-4 py-2 rounded-3 fw-semibold' : 'logistics-order-action'}
          title="Reschedule Order" aria-label={`Reschedule order ${number}`} disabled={!id || saving} onClick={openReschedule}>
          <i className={expanded ? 'ti ti-calendar-time me-2' : 'ti ti-x'} />
          {expanded && 'Reschedule'}
        </Button>
      </Stack>
      <Modal show={Boolean(action)} onHide={() => !saving && setAction(null)} centered>
        <Form onSubmit={submit}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>{action === 'approve' ? 'Approve Order for Packing' : 'Reschedule Order'} {number}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {action === 'approve' ? <p>Are you sure you want to approve order {number} for packing?</p> : (
              <>
                <Form.Group className="mb-3" controlId={`reschedule-eta-${id}`}>
                  <Form.Label>Proposed ETA Date (Optional)</Form.Label>
                  <Form.Control type="date" value={form.eta} disabled={saving} onChange={(event) => setForm({ ...form, eta: event.target.value })} />
                </Form.Group>
                <Form.Group className="mb-3" controlId={`reschedule-loading-${id}`}>
                  <Form.Label>Proposed Loading Date *</Form.Label>
                  <Form.Control type="date" required value={form.loading} disabled={saving} onChange={(event) => setForm({ ...form, loading: event.target.value })} />
                </Form.Group>
                <Form.Group controlId={`reschedule-notes-${id}`}>
                  <Form.Label>Notes *</Form.Label>
                  <Form.Control as="textarea" rows={4} required value={form.notes} disabled={saving} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light-secondary" disabled={saving} onClick={() => setAction(null)}>Cancel</Button>
            <Button type="submit" variant={action === 'approve' ? 'success' : 'danger'} disabled={saving || (action === 'reschedule' && (!form.loading || !form.notes.trim()))}>
              {saving ? 'Submitting...' : action === 'approve' ? 'Yes, Approve' : 'Submit Reschedule'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

RescheduleOrderActions.propTypes = { order: PropTypes.object.isRequired, onSuccess: PropTypes.func.isRequired, expanded: PropTypes.bool };
