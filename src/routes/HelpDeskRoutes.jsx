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
      path: 'coporate/help-desk',
      element: <HelpDesk />
    },
    {
      path: 'coporate/help-desk/create',
      element: <HelpDesk view="create" />
    },
    {
      path: 'coporate/help-desk/:ticketId',
      element: <HelpDesk view="detail" />
    },
    {
      path: 'help-desk',
      element: <Navigate to="/coporate/help-desk" replace />
    },
    {
      path: 'customer-portal/help-desk/*',
      element: <Navigate to="/coporate/help-desk" replace />
    },
    {
      path: 'support/help-desk/*',
      element: <Navigate to="/coporate/help-desk" replace />
    }
  ]
};

export default HelpDeskRoutes;
