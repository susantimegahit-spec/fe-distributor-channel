import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import { getCookies } from '../../utils/cookies';
import { getAvailableSystems, normalizeAccessibleSystems, systems } from '../../systems';

export default function SystemSelector() {
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
  const availableSystems = systemAccess.length ? systems.filter((system) => systemAccess.includes(system.key)) : permissionSystems;

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <Modal show centered backdrop="static" keyboard={false} size="lg">
        <Modal.Header>
          <Modal.Title>
            <Stack gap={1}>
              <span>Pilih Aplikasi</span>
              <small className="text-muted fw-normal">Akses aplikasi tersedia mengikuti permission user login.</small>
            </Stack>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!availableSystems.length ? (
            <div className="text-center py-4">
              <div className="avtar avtar-xl bg-light-warning text-warning mx-auto mb-3">
                <i className="ti ti-lock f-24" />
              </div>
              <h5 className="mb-1">Belum ada akses aplikasi</h5>
              <p className="text-muted mb-0">Hubungi administrator untuk mengatur permission aplikasi.</p>
            </div>
          ) : null}

          <Row className="g-3">
            {availableSystems.map((system) => (
              <Col md={availableSystems.length === 1 ? 12 : 6} key={system.key}>
                <Card className="h-100 border">
                  <Card.Body>
                    <Stack gap={3} className="h-100">
                      <Stack direction="horizontal" gap={3} className="align-items-start">
                        <span className="avtar avtar-s bg-light-primary text-primary">
                          <i className={`${system.icon} f-22`} />
                        </span>
                        <div>
                          <h5 className="mb-1">{system.title}</h5>
                          <p className="text-muted mb-0">{system.description}</p>
                        </div>
                      </Stack>
                      <div className="mt-auto">
                        <Button as={Link} to={system.defaultPath} variant="primary" className="w-100">
                          Buka Aplikasi
                        </Button>
                      </div>
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Modal.Body>
      </Modal>
    </div>
  );
}
