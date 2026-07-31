import { Navigate } from 'react-router-dom';

// project-imports
import { getCookies } from '../../utils/cookies';
import {
  getFirstAccessibleMenuPath,
  isAdministratorRole,
  normalizeAccessibleSystems,
  systems
} from '../../systems';

export default function SystemSelector() {
  const roleId = getCookies('role');
  const permissionMenu = getCookies('menu') || [];
  const availableSystemKeys = new Set(normalizeAccessibleSystems(getCookies('system')));
  const availableSystems = systems.filter(
    (system) => isAdministratorRole(roleId) || availableSystemKeys.has(system.key)
  );

  if (!availableSystems.length) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ requestedSystem: 'sistem yang tersedia', noAvailableSystems: true }}
      />
    );
  }

  const firstSystemWithAccessibleMenu = availableSystems
    .map((system) => ({
      system,
      menuPath: getFirstAccessibleMenuPath(system, permissionMenu, roleId)
    }))
    .find(({ menuPath }) => Boolean(menuPath));
  const defaultSystem = firstSystemWithAccessibleMenu?.system || availableSystems[0];
  const defaultPath =
    firstSystemWithAccessibleMenu?.menuPath || defaultSystem.defaultPath;

  return <Navigate to={defaultPath} replace />;
}
