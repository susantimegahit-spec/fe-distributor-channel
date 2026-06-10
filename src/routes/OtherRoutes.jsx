import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';

// render - other pages
const OtherSamplePage = Loadable(lazy(() => import('views/SamplePage')));
const OrderCreate = Loadable(lazy(() => import('views/order/OrderCreate')));
// ==============================|| OTHER ROUTING ||============================== //

const OtherRoutes = {
  path: 'order/order-create',
  element: <OrderCreate />
  // path: '/',
  // children: [
  //   {
  //     path: '/',
  //     element: <DashboardLayout />,
  //     children: [
  //       {
  //         path: 'other',
  //         children: [
  //           {
  //             path: 'sample-page',
  //             element: <OtherSamplePage />
  //           }
  //         ]
  //       }
  //     ]
  //   }
  // ]
};

export default OtherRoutes;
