import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';

// react-bootstrap
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

export default function AccessDenied({ showSystemSelector = true }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const requestedSystem = state?.requestedSystem;
  const requestedMenu = state?.requestedMenu;

  return (
    <div className="d-flex align-items-center justify-content-center py-5">
      <Card className="border shadow-sm mb-0" style={{ maxWidth: 560, width: '100%' }}>
        <Card.Body className="p-4 p-md-5 text-center">
          <span className="avtar avtar-xl bg-light-danger text-danger mb-3">
            <i className="ti ti-shield-lock f-32" />
          </span>
          <div className="text-danger fw-semibold mb-2">403 — Access Denied</div>
          <h3 className="mb-2">You don&apos;t have access to this {requestedMenu ? 'menu' : 'system'}</h3>
          <p className="text-muted mb-4">
            {requestedMenu
              ? `Your account is not authorized to open the ${requestedMenu} menu in ${requestedSystem}.`
              : requestedSystem
              ? `Your account is not authorized to open the ${requestedSystem} system.`
              : 'Your account is not authorized to open the requested system.'}
          </p>

          <Alert variant="warning" className="text-start f-12">
            Please contact an administrator if you need access. The administrator can enable it from Setting → Access Control.
          </Alert>

          {showSystemSelector && (
            <Stack direction="horizontal" gap={2} className="justify-content-center flex-wrap mt-4">
              <Button onClick={() => navigate('/systems', { replace: true })}>
                <i className="ti ti-apps me-1" />
                Choose Available System
              </Button>
            </Stack>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

AccessDenied.propTypes = {
  showSystemSelector: PropTypes.bool
};
