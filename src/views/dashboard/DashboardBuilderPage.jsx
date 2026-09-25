import { Navigate, useNavigate } from 'react-router-dom';

import { isAdministratorRole } from '../../systems';
import { getCookies } from '../../utils/cookies';
import DashboardBuilder from './DashboardBuilder';

export default function DashboardBuilderPage() {
  const navigate = useNavigate();
  const roleId = String(getCookies('role') || '');

  if (!isAdministratorRole(roleId)) return <Navigate to="/access-denied" replace />;

  const closeBuilder = () => {
    window.close();
    window.setTimeout(() => navigate('/dashboard', { replace: true }), 100);
  };

  return <DashboardBuilder show onClose={closeBuilder} roleId={roleId} onSaved={() => {}} />;
}
