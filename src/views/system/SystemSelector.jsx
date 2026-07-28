import { Navigate, useNavigate } from 'react-router-dom';

// react-bootstrap
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';

// project-imports
import { getCookies } from '../../utils/cookies';
import { normalizeAccessibleSystems, systems } from '../../systems';
import AccessDenied from './AccessDenied';
import './system-selector.scss';

export default function SystemSelector() {
  const navigate = useNavigate();
  const availableSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const availableSystems = systems.filter((system) => availableSystemKeys.has(system.key));
  const defaultSystem = availableSystems[0];

  if (!availableSystems.length) {
    return <AccessDenied showSystemSelector={false} />;
  }

  if (availableSystems.length > 1) {
    return (
      <Modal show centered backdrop="static" keyboard={false} size="lg">
        <Modal.Header className="system-selector__header">
          <div>
            <Modal.Title>Choose System</Modal.Title>
            <div className="text-muted f-12">Select the workspace you want to open.</div>
          </div>
        </Modal.Header>
        <Modal.Body className="system-selector__body">
          <Row className="g-3">
            {availableSystems.map((system) => (
              <Col xs={12} sm={6} key={system.key}>
                <Card
                  className={`system-selector__card system-selector__card--${system.key} border mb-0 h-100`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(system.defaultPath)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(system.defaultPath);
                    }
                  }}
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center">
                    <span className="system-selector__icon">
                      <i className={system.icon} />
                    </span>
                    <h5 className="mb-2">{system.title}</h5>
                    <p className="text-muted mb-4">{system.description}</p>
                    <span className="system-selector__button btn mt-auto">Open {system.title}</span>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Modal.Body>
      </Modal>
    );
  }

  return <Navigate to={defaultSystem.defaultPath} replace />;
}
