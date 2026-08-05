import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const PurchasingPlaceholder = Loadable(lazy(() => import('views/purchasing/PurchasingPlaceholder')));

const PurchasingRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'purchasing/dashboard',
      element: (
        <PurchasingPlaceholder
          title="Purchasing Dashboard"
          description="Monitor purchasing activity and supplier performance."
          icon="ti ti-shopping-cart"
        />
      )
    },
    {
      path: 'purchasing/orders',
      element: (
        <PurchasingPlaceholder
          title="Purchase Orders"
          description="Create and monitor purchase orders."
          icon="ti ti-file-invoice"
        />
      )
    },
    {
      path: 'purchasing/master/suppliers',
      element: (
        <PurchasingPlaceholder
          title="Suppliers"
          description="Manage purchasing supplier master data."
          icon="ti ti-building-warehouse"
        />
      )
    }
  ]
};

export default PurchasingRoutes;
