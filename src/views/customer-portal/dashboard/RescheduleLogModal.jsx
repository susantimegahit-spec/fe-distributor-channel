import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import moment from 'moment';
import LogisticsServices from '../../../services/logistics/LogisticsServices';
import RescheduleOrderActions from './RescheduleOrderActions';

const textValue = (...values) => values.find((value) => typeof value === 'string' || typeof value === 'number') ?? '';
const dateLabel = (value) => value && moment(value).isValid() ? moment(value).format('DD MMM YYYY') : '-';
const chatPalettes = [
  { background: '#f1f5f9', accent: '#64748b' },
  { background: '#e0efff', accent: '#2f80d1' },
  { background: '#fff7ed', accent: '#c2410c' },
  { background: '#fdf2f8', accent: '#be185d' }
];

const getLogParticipant = (log) => {
  const role = String(textValue(log.actor_type, log.user_type, log.role, log.created_by?.role, log.user?.role)).toUpperCase();
  const action = String(textValue(log.action, log.status, log.event)).toUpperCase().replaceAll('_', ' ');
  const identity = `${role} ${action}`;
  const fallback = /ADMIN SALES/.test(identity)
    ? 'Admin Sales'
    : /CUSTOMER|DISTRIBUTOR/.test(identity)
      ? 'Customer'
      : /LOGISTIC/.test(identity)
        ? 'Logistics'
        : 'Activity';

  return String(textValue(
    log.username,
    log.user_name,
    log.created_by?.username,
    log.user?.username,
    log.created_by?.name,
    log.user?.name,
    log.actor_name,
    log.created_by_name
  ) || fallback).trim();
};

export default function RescheduleLogModal({ order, onClose, onSuccess }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const id = order.requested_order_id ?? order.id ?? order.sales_order_id;
  const participants = [...new Set(logs.map(getLogParticipant))];

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
          <ol className="list-unstyled mb-0 w-100" aria-label="Negotiation history">
            {logs.map((log, index) => {
              const action = textValue(log.action, log.status, log.event);
              const sender = getLogParticipant(log);
              const participantIndex = Math.max(participants.indexOf(sender), 0);
              const isRightAligned = participantIndex % 2 === 1;
              const colors = chatPalettes[participantIndex % chatPalettes.length];
              const details = log.payload ?? log.metadata ?? log;
              const notes = textValue(log.notes, log.message, log.comment, details.notes);
              return (
                <li key={log.id ?? index} className={`d-flex w-100 mb-3 ${isRightAligned ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div
                    className={`reschedule-chat-bubble ${isRightAligned ? 'is-right' : 'is-left'}`}
                    style={{ '--chat-background': colors.background, '--chat-accent': colors.accent }}
                  >
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
