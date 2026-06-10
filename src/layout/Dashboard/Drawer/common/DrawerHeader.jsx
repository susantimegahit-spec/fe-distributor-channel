import { Link } from 'react-router-dom';

// react-bootstrap
import Image from 'react-bootstrap/Image';

// project-import
import { APP_DEFAULT_PATH } from 'config';

// assets
import SusantiMegahLogo from 'assets/images/susanti-megah-logo.svg';

export const DrawerHeader = () => {
  return (
    <div className="m-header">
      <Link to={APP_DEFAULT_PATH} className="b-brand sm-sidebar-brand">
        <Image src={SusantiMegahLogo} alt="PT. Susanti Megah" className="sm-sidebar-logo" />
        <span className="sm-sidebar-brand-text">
          <strong>Susanti Megah</strong>
          <small>Distributor Channel</small>
        </span>
      </Link>
    </div>
  );
};
