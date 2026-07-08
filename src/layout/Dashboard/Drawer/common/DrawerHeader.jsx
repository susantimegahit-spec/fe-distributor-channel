import { Link, useLocation } from 'react-router-dom';

// react-bootstrap
import Image from 'react-bootstrap/Image';
import CustomerPortalMark from 'assets/images/customer-portal-mark.png';
import { getSystemLabel } from '../../../../systems';

// project-import
import { APP_DEFAULT_PATH } from 'config';

export const DrawerHeader = () => {
  const { pathname } = useLocation();

  return (
    <div className="m-header">
      <Link to={APP_DEFAULT_PATH} className="b-brand sm-sidebar-brand">
        <Image src={CustomerPortalMark} alt="sm-connect" className="sm-sidebar-logo" />
        <span className="sm-sidebar-brand-text">
          <strong>SM-CONNECT</strong>
          <small>{getSystemLabel(pathname)}</small>
        </span>
      </Link>
    </div>
  );
};
