import { Navigate } from 'react-router-dom';

// project-imports
import { getCookies } from '../../utils/cookies';
import { isAdministratorRole, normalizeAccessibleSystems, systems } from '../../systems';

export default function SystemSelector() {
  const roleId = getCookies('role');
  const availableSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const availableSystems = systems.filter((system) => isAdministratorRole(roleId) || availableSystemKeys.has(system.key));

  if (!availableSystems.length) {
    return <Navigate to="/access-denied" replace state={{ requestedSystem: 'sistem yang tersedia', noAvailableSystems: true }} />;
  }

  return <Navigate to="/dashboard" replace />;
}
