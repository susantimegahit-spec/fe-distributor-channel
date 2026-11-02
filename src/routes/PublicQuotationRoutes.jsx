import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Loadable from 'components/Loadable';
import { NotFoundPage } from '../views/ErrorBoundary';

const PublicQuotationOffer = Loadable(lazy(() => import('views/public-quotation/PublicQuotationOffer')));

const PublicQuotationRoutes = createBrowserRouter(
  [
    { path: '/quotation-offer/:token', element: <PublicQuotationOffer /> },
    { path: '*', element: <NotFoundPage /> }
  ],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);

export default PublicQuotationRoutes;
