import { createBrowserRouter } from 'react-router-dom';

// project-imports
import OtherRoutes from './OtherRoutes';
import NavigationRoutes from './NavigationRoutes';
import MasterRoutes from './MasterRoutes';
import SettingRoutes from './SettingRoutes';
import OrderRoutes from './OrderRoutes';
import FinanceRoutes from './FinanceRoutes';
import ExpeditionRoutes from './ExpeditionRoutes';
import PickingListRoutes from './PickingListRoutes';
import ProductionRoutes from './ProductionRoutes';
import HelpDeskRoutes from './HelpDeskRoutes';
import { NotFoundPage } from '../views/ErrorBoundary';
import ErrorPage from '../views/errors/ErrorPage';

const ERROR_STATUSES = [400, 401, 403, 404, 408, 429, 500, 502, 503, 504];

// ==============================|| ROUTING RENDER ||============================== //
const router = createBrowserRouter(
  [
    NavigationRoutes,
    // ComponentsRoutes,
    // FormsRoutes,
    // TablesRoutes,
    // PagesRoutes,
    // OtherRoutes,
    // ChartMapRoutes,
    MasterRoutes,
    SettingRoutes,
    OrderRoutes,
    FinanceRoutes,
    ExpeditionRoutes,
    PickingListRoutes,
    ProductionRoutes,
    HelpDeskRoutes,
    OtherRoutes,
    ...ERROR_STATUSES.map((status) => ({
      path: `/${status}`,
      element: <ErrorPage status={status} />
    })),
    {
      path: '/maintenance',
      element: <ErrorPage status={503} />
    },
    { path: '*', element: <NotFoundPage /> }
    // MenuRoutes
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;
