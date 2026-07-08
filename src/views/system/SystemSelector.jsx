import { Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Stack from 'react-bootstrap/Stack';

// project-imports
import { getCookies } from '../../utils/cookies';
import { getAvailableSystems, isAdministratorRole, normalizeAccessibleSystems, systems } from '../../systems';

export default function SystemSelector() {
  const navigate = useNavigate();
  const roleId = getCookies('role');
  const menuPermission = getCookies('menu');
  const systemPermission = getCookies('systems');
  const reduxSystemAccess = useSelector((state) => state.auth?.accessible_system || []);
  const systemAccess = reduxSystemAccess.length ? reduxSystemAccess : normalizeAccessibleSystems(getCookies('system'));
  const permissionMenu = [
    ...(Array.isArray(menuPermission) ? menuPermission : []),
    ...(Array.isArray(systemPermission) ? systemPermission : [])
  ];
  const permissionSystems = getAvailableSystems(permissionMenu, roleId);
  const isAdministrator = isAdministratorRole(roleId);
  const availableSystemKeys = new Set([...systemAccess, ...permissionSystems.map((system) => system.key)]);
  const availableSystems = isAdministrator
    ? systems
    : availableSystemKeys.size
      ? systems.filter((system) => availableSystemKeys.has(system.key))
      : permissionSystems;
  const defaultSystem = availableSystems[0] || systems[0];

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
