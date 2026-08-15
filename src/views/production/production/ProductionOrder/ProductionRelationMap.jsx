import { useEffect, useState } from 'react';

import Modal from 'react-bootstrap/Modal';

import './production-relation-map.scss';

const dummyRelations = {
  issues: [
    { number: '260810789', date: '11/08/26', amount: 'IDR 3.060.000,00' },
    { number: '260840079', date: '11/08/26', amount: 'IDR 244.025.376,53' }
  ],
  receipt: { number: '260840010', date: '11/08/26', amount: 'IDR 251.970.781,02' }
};

const canvasSize = { width: 1000, height: 560 };
const cardSizes = {
  order: { width: 190, height: 310 },
  issueTop: { width: 190, height: 203 },
  receipt: { width: 190, height: 203 },
  issueBottom: { width: 190, height: 203 }
};
const initialPositions = {
  order: { x: 90, y: 190 },
  issueTop: { x: 365, y: 55 },
  receipt: { x: 710, y: 140 },
  issueBottom: { x: 500, y: 330 }
};

const getConnector = (positions, fromKey, toKey) => {
  const from = { ...positions[fromKey], ...cardSizes[fromKey] };
  const to = { ...positions[toKey], ...cardSizes[toKey] };
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const delta = { x: toCenter.x - fromCenter.x, y: toCenter.y - fromCenter.y };
  const safeX = Math.abs(delta.x) || 0.0001;
  const safeY = Math.abs(delta.y) || 0.0001;
  const fromScale = Math.min(from.width / 2 / safeX, from.height / 2 / safeY);
  const toScale = Math.min(to.width / 2 / safeX, to.height / 2 / safeY);

  return {
    x1: fromCenter.x + delta.x * fromScale,
    y1: fromCenter.y + delta.y * fromScale,
    x2: toCenter.x - delta.x * toScale,
    y2: toCenter.y - delta.y * toScale
  };
};

function RelationCard({ cardKey, position, title, children, onDragStart }) {
  return (
    <article
      className={`production-relation-card production-relation-card--${cardKey}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => onDragStart(cardKey, event)}
    >
      <header>{title}</header>
      <div className="production-relation-card__body">{children}</div>
    </article>
  );
}

export default function ProductionRelationMap({ order, onClose }) {
  const [positions, setPositions] = useState(initialPositions);
  const firstIssue = dummyRelations.issues[0];
  const secondIssue = dummyRelations.issues[1];
  const receipt = dummyRelations.receipt;
  const orderToIssueTop = getConnector(positions, 'order', 'issueTop');
  const orderToReceipt = getConnector(positions, 'order', 'receipt');
  const orderToIssueBottom = getConnector(positions, 'order', 'issueBottom');
  const issueToReceipt = getConnector(positions, 'issueTop', 'receipt');

  useEffect(() => {
    if (order) setPositions(initialPositions);
  }, [order]);

  const handleDragStart = (cardKey, event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startPointer = { x: event.clientX, y: event.clientY };
    const startPosition = positions[cardKey];
    const cardSize = cardSizes[cardKey];
    const move = (moveEvent) => {
      const x = Math.min(Math.max(startPosition.x + moveEvent.clientX - startPointer.x, 0), canvasSize.width - cardSize.width);
      const y = Math.min(Math.max(startPosition.y + moveEvent.clientY - startPointer.y, 0), canvasSize.height - cardSize.height);
      setPositions((current) => ({ ...current, [cardKey]: { x, y } }));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  return (
    <Modal show={Boolean(order)} onHide={onClose} fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Relation Map</Modal.Title>
      </Modal.Header>
      <Modal.Body className="production-relation-modal">
        <div className="production-relation-heading">
          <div>
            <h5 className="mb-1">Production Relationship Map</h5>
            <p className="text-muted mb-0">Alur dokumen Production Order, Issue, dan Receipt (dummy data).</p>
          </div>
          <span className="badge bg-light-warning text-warning">Production Tree</span>
        </div>

        <div className="production-relation-scroll">
          <div className="production-relation-canvas">
            <svg className="production-relation-lines" viewBox="0 0 1000 560" aria-hidden="true">
              <defs>
                <marker
                  id="relation-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
                <marker
                  id="relation-arrow-secondary"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              <line {...orderToIssueTop} />
              <line {...orderToReceipt} />
              <line {...orderToIssueBottom} />
              <line className="production-relation-lines__secondary" {...issueToReceipt} />
            </svg>

            <RelationCard cardKey="order" position={positions.order} title="Production Order" onDragStart={handleDragStart}>
              <dl>
                <dt>Order No.</dt>
                <dd>{order?.number || '260840012'}</dd>
                <dt>Item</dt>
                <dd>{order?.itemCode || 'E67.G'}</dd>
                <dt>Type</dt>
                <dd>{order?.type || 'Special'}</dd>
                <dt>Status</dt>
                <dd>{order?.status || 'Closed'}</dd>
                <dt>Date</dt>
                <dd>11/08/26</dd>
                <dt>Planned Qty</dt>
                <dd>{order?.plannedQuantity || '160,00'}</dd>
                <dt>Completed Qty</dt>
                <dd>{order?.completedQuantity || '153,00'}</dd>
              </dl>
            </RelationCard>

            <RelationCard cardKey="issueTop" position={positions.issueTop} title="Issue for Production" onDragStart={handleDragStart}>
              <dl>
                <dt>Document No.</dt>
                <dd>{firstIssue.number}</dd>
                <dt>Date</dt>
                <dd>{firstIssue.date}</dd>
              </dl>
              <div className="production-relation-card__amount">{firstIssue.amount}</div>
            </RelationCard>

            <RelationCard cardKey="receipt" position={positions.receipt} title="Receipt from Production" onDragStart={handleDragStart}>
              <dl>
                <dt>Document No.</dt>
                <dd>{receipt.number}</dd>
                <dt>Date</dt>
                <dd>{receipt.date}</dd>
              </dl>
              <div className="production-relation-card__amount">{receipt.amount}</div>
            </RelationCard>

            <RelationCard cardKey="issueBottom" position={positions.issueBottom} title="Issue for Production" onDragStart={handleDragStart}>
              <dl>
                <dt>Document No.</dt>
                <dd>{secondIssue.number}</dd>
                <dt>Date</dt>
                <dd>{secondIssue.date}</dd>
              </dl>
              <div className="production-relation-card__amount">{secondIssue.amount}</div>
            </RelationCard>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
