import { Link } from 'react-router-dom';

// react-bootstrap
import Image from 'react-bootstrap/Image';
import CustomerPortalMark from 'assets/images/customer-portal-mark.png';

// project-import
import { APP_DEFAULT_PATH } from 'config';

export const DrawerHeader = () => {
  return (
    <div className="m-header">
      <Link to={APP_DEFAULT_PATH} className="b-brand sm-sidebar-brand">
        <Image src={CustomerPortalMark} alt="Customer Portal" className="sm-sidebar-logo" />
        <span className="sm-sidebar-brand-text">
          <strong>SM-Connect</strong>
          <small>Customer Portal</small>
        </span>
      </Link>
    </div>
  );
};
