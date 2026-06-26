import { createBrowserRouter } from 'react-router-dom';

// project-imports
import OtherRoutes from './OtherRoutes';
import NavigationRoutes from './NavigationRoutes';
import MasterRoutes from './MasterRoutes';
import SettingRoutes from './SettingRoutes';
import OrderRoutes from './OrderRoutes';
import FinanceRoutes from './FinanceRoutes';
import { NotFoundPage } from '../views/ErrorBoundary';

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
    OtherRoutes,
    { path: '*', element: <NotFoundPage /> }
    // MenuRoutes
  ],
  {
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;
