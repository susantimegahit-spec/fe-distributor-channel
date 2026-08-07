import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import ErrorPage from '../errors/ErrorPage';

export default function AccessDenied({ showSystemSelector = true }) {
  const { state } = useLocation();
  const requestedSystem = state?.requestedSystem;
  const requestedMenu = state?.requestedMenu;
  const noAvailableSystems = state?.noAvailableSystems;
  const target = requestedMenu ? `the ${requestedMenu} menu` : requestedSystem ? `the ${requestedSystem} system` : 'this page';
  const detail = requestedSystem
    ? `Your account is not authorized to open ${target}. Contact your administrator if you need access.`
    : 'Contact your administrator if you believe you should have access. Permissions can be configured under Settings → Access Control.';

  return (
    <ErrorPage
      status={403}
      description={`You do not have permission to open ${target}.`}
      detail={detail}
      actionLabel={showSystemSelector ? 'Choose an available system' : 'Back to home'}
      actionHref={showSystemSelector ? '/systems' : '/'}
      showPrimaryAction={!noAvailableSystems}
    />
  );
}

AccessDenied.propTypes = {
  showSystemSelector: PropTypes.bool
};
