import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import moment from 'moment';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import RescheduleOrderActions from './RescheduleOrderActions';

const textValue = (...values) => values.find((value) => typeof value === 'string' || typeof value === 'number') ?? '';
const dateLabel = (value) => value && moment(value).isValid() ? moment(value).format('DD MMM YYYY') : '-';

export default function RescheduleLogModal({ order, onClose, onSuccess }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const id = order.requested_order_id ?? order.id ?? order.sales_order_id;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setLogs([]);
    const load = async () => {
      try {
        const response = await LogisticsServices.getRescheduleLog(id);
        if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
          throw new Error(response?.data?.message || 'Unable to load negotiation history');
        }
        const payload = response?.data?.data ?? response?.data ?? [];
        const collection = Array.isArray(payload) ? payload : payload.logs ?? payload.items ?? payload.data ?? [];
        const rows = Array.isArray(collection) ? collection : collection.data ?? [];
        if (active) setLogs([...rows].sort((a, b) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0)));
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err.message || 'Unable to load negotiation history');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id, attempt]);

  return (
    <Modal show onHide={onClose} centered dialogClassName="vendor-rates-approval-dialog">
      <Modal.Header closeButton>
        <div>
          <Modal.Title>Reschedule Negotiation</Modal.Title>
          <small className="text-muted">SO {order.sap_doc_num || order.doc_num || order.order_no || id} · {order.customer_name || '-'}</small>
        </div>
      </Modal.Header>
      <Modal.Body style={{ background: '#f1f5f9', minHeight: 260 }}>
        {loading ? <div className="text-center py-5" role="status"><Spinner size="sm" /> Loading history...</div> : error ? (
          <Alert variant="danger">{error} <Button variant="link" onClick={() => setAttempt((value) => value + 1)}>Retry</Button></Alert>
        ) : !logs.length ? <p className="text-center text-muted py-5">No negotiation history yet.</p> : (
          <ol className="list-unstyled mb-0" aria-label="Negotiation history">
            {logs.map((log, index) => {
              const role = String(textValue(log.actor_type, log.user_type, log.role, log.created_by?.role, log.user?.role)).toLowerCase();
              const action = textValue(log.action, log.status, log.event);
              const identity = `${role} ${action}`.toUpperCase().replaceAll('_', ' ');
              const customer = /ADMIN SALES|CUSTOMER|DISTRIBUTOR/.test(identity);
              const party = /ADMIN SALES/.test(identity) ? 'Admin Sales' : /CUSTOMER|DISTRIBUTOR/.test(identity) ? 'Customer' : /LOGISTIC/.test(identity) ? 'Logistics' : 'Activity';
              const sender = textValue(log.created_by?.name, log.user?.name, log.actor_name, log.created_by_name) || party;
              const status = String(action).toUpperCase();
              const colors = /REJECT|CANCEL/.test(status)
                ? { background: '#fff1f2', accent: '#be123c' }
                : /APPROV|ACCEPT|CONFIRM/.test(status)
                  ? { background: '#ecfdf5', accent: '#047857' }
                  : /RESCHEDULE/.test(status)
                    ? { background: '#f3e8ff', accent: '#7e22ce' }
                    : { background: '#eff6ff', accent: '#1d4ed8' };
              const details = log.payload ?? log.metadata ?? log;
              const notes = textValue(log.notes, log.message, log.comment, details.notes);
              return (
                <li key={log.id ?? index} className={`d-flex mb-3 ${customer ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className="p-3 shadow-sm" style={{ maxWidth: '85%', borderRadius: 16, background: colors.background, border: `1px solid ${colors.accent}`, color: '#334155' }}>
                    <div className="fw-semibold" style={{ color: colors.accent }}>{sender}</div>
                    {action && <small className="d-block mb-2 fw-semibold" style={{ color: colors.accent }}>{String(action).replaceAll('_', ' ')}</small>}
                    {notes && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{notes}</div>}
                    {details.proposed_delivery_date && <div className="mt-2"><strong>Proposed Loading:</strong> {dateLabel(details.proposed_delivery_date)}</div>}
                    {details.proposed_eta_date && <div><strong>Proposed ETA:</strong> {dateLabel(details.proposed_eta_date)}</div>}
                    <small className="d-block text-muted mt-2">{log.created_at && moment(log.created_at).isValid() ? moment(log.created_at).format('DD MMM YYYY · HH:mm') : '-'}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-between gap-2">
        <Button variant="light-secondary" className="px-4 py-2 rounded-3" onClick={onClose}>Close</Button>
        <RescheduleOrderActions
          expanded
          order={order}
          onSuccess={() => {
            setAttempt((value) => value + 1);
            onSuccess?.();
          }}
        />
      </Modal.Footer>
    </Modal>
  );
}

RescheduleLogModal.propTypes = {
  order: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};
