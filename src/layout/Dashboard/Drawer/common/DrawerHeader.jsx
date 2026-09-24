import { Link } from 'react-router-dom';

// react-bootstrap
import Image from 'react-bootstrap/Image';
import SmestaLogo from 'assets/images/smesta_text_transparent.png';

export const DrawerHeader = () => {
  return (
    <div className="m-header">
      <Link className="b-brand sm-sidebar-brand" to="/dashboard" aria-label="Open dashboard">
        <Image src={SmestaLogo} alt="SMESTA" className="sm-sidebar-logo" />
      </Link>
    </div>
  );
};
