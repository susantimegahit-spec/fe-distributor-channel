import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// project-imports
import { getCookies } from '../../utils/cookies';
import { getAvailableSystems, normalizeAccessibleSystems, systems } from '../../systems';

export default function SystemSelector() {
  const roleId = getCookies('role');
  const menuPermission = getCookies('menu');
  const systemPermission = getCookies('systems');
  const reduxSystemAccess = useSelector((state) => state.auth?.accessible_system || []);
  const systemAccess = reduxSystemAccess.length ? reduxSystemAccess : normalizeAccessibleSystems(getCookies('system'));
  const permissionMenu = [
    ...(Array.isArray(menuPermission) ? menuPermission : []),
    ...(Array.isArray(systemPermission) ? systemPermission : [])
  ];
  const permissionSystems = getAvailableSystems(permissionMenu, roleId);
  const availableSystems = systemAccess.length ? systems.filter((system) => systemAccess.includes(system.key)) : permissionSystems;
  const defaultSystem = availableSystems[0] || systems[0];

  return <Navigate to={defaultSystem.defaultPath} replace />;
}
