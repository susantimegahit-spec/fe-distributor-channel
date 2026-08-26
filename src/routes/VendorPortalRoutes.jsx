import { createBrowserRouter, Navigate } from 'react-router-dom';

import VendorPortal from 'views/vendor-portal/VendorPortal';

const VendorPortalRoutes = createBrowserRouter(
  [
    {
      path: '/vendor-portal',
      element: <VendorPortal />
    },
    {
      path: '/vendor-portal/:page',
      element: <VendorPortal />
    },
    {
      path: '/vendor-portal/dashboard/:vendorType',
      element: <VendorPortal />
    },
    {
      path: '*',
      element: <Navigate to="/vendor-portal" replace />
    }
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default VendorPortalRoutes;
