import { Navigate, useNavigate } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Stack from 'react-bootstrap/Stack';

// project-imports
import { getCookies } from '../../utils/cookies';
import { normalizeAccessibleSystems, systems } from '../../systems';
import AccessDenied from './AccessDenied';

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
        <Modal.Header>
          <div>
            <Modal.Title>Choose System</Modal.Title>
            <div className="text-muted f-12">Select the workspace you want to open.</div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            {availableSystems.map((system) => (
              <Card className="border mb-0" key={system.key}>
                <Card.Body>
                  <Stack direction="horizontal" gap={3} className="align-items-start justify-content-between flex-wrap">
                    <Stack direction="horizontal" gap={3} className="align-items-start">
                      <span className="avtar avtar-s bg-light-primary text-primary">
                        <i className={system.icon} />
                      </span>
                      <div>
                        <h5 className="mb-1">{system.title}</h5>
                        <p className="text-muted mb-0">{system.description}</p>
                      </div>
                    </Stack>
                    <Button onClick={() => navigate(system.defaultPath)}>
                      Open {system.title}
                    </Button>
                  </Stack>
                </Card.Body>
              </Card>
            ))}
          </Stack>
        </Modal.Body>
      </Modal>
    );
  }

  return <Navigate to={defaultSystem.defaultPath} replace />;
}
