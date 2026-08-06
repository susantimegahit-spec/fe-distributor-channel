import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

const HelpDesk = Loadable(lazy(() => import('views/support/helpdesk/HelpDesk')));

const HelpDeskRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    {
      path: 'enterprise/help-desk',
      element: <HelpDesk />
    },
    {
      path: 'enterprise/help-desk/create',
      element: <HelpDesk view="create" />
    },
    {
      path: 'enterprise/help-desk/:ticketId',
      element: <HelpDesk view="detail" />
    },
    {
      path: 'help-desk',
      element: <Navigate to="/enterprise/help-desk" replace />
    },
    {
      path: 'customer-portal/help-desk/*',
      element: <Navigate to="/enterprise/help-desk" replace />
    },
    {
      path: 'support/help-desk/*',
      element: <Navigate to="/enterprise/help-desk" replace />
    }
  ]
};

export default HelpDeskRoutes;
