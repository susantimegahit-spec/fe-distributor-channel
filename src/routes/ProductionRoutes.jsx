import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import { RouteErrorBoundary } from 'views/ErrorBoundary';

const ProductionDashboard = Loadable(lazy(() => import('views/production/dashboard/ProductionDashboard')));
const Material = Loadable(lazy(() => import('views/production/master/material/Material')));
const Resource = Loadable(lazy(() => import('views/production/master/resource/Resource')));
const Warehouse = Loadable(lazy(() => import('views/production/master/warehouse/Warehouse')));
const BillOfMaterial = Loadable(lazy(() => import('views/production/production/BillOfMaterial/BillOfMaterial')));
const ProductionOrder = Loadable(lazy(() => import('views/production/production/ProductionOrder/ProductionOrder')));
const ReceiptProduction = Loadable(lazy(() => import('views/production/production/ReceiptProduction/ReceiptProduction')));
const IssueProduction = Loadable(lazy(() => import('views/production/production/IssueProduction/IssueProduction')));
const InventoryTransfer = Loadable(lazy(() => import('views/production/production/InventoryTransfer/InventoryTransfer')));
const ChangeProduct = Loadable(lazy(() => import('views/production/production/ChangeProduct/ChangeProduct')));

const ProductionRoutes = {
  path: '/',
  element: <DashboardLayout />,
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'production/dashboard',
      element: <ProductionDashboard />
    },
    {
      path: 'production/master/material',
      element: <Material />
    },
    {
      path: 'production/master/resource',
      element: <Resource />
    },
    {
      path: 'production/master/warehouse',
      element: <Warehouse />
    },
    {
      path: 'production/bill-of-material',
      element: <BillOfMaterial />
    },
    {
      path: 'production/order',
      element: <ProductionOrder />
    },
    {
      path: 'production/receipt',
      element: <ReceiptProduction />
    },
    {
      path: 'production/issue',
      element: <IssueProduction />
    },
    {
      path: 'production/inventory-transfer',
      element: <InventoryTransfer />
    },
    {
      path: 'production/change-product',
      element: <ChangeProduct />
    }
  ]
};

export default ProductionRoutes;
