import { normalizeAccessibleSystems } from '../systems';
import { getCookies } from '../utils/cookies';

const SET_ACCESSIBLE_SYSTEM = 'auth/SET_ACCESSIBLE_SYSTEM';
const DESTROY_AUTH_STATE = 'auth/DESTROY_AUTH_STATE';

const initialState = {
  accessible_system: normalizeAccessibleSystems(getCookies('system'))
};

export const setAccessibleSystem = (accessibleSystem) => ({
  type: SET_ACCESSIBLE_SYSTEM,
  payload: normalizeAccessibleSystems(accessibleSystem)
});

export const destroyAuthState = () => ({
  type: DESTROY_AUTH_STATE
});

export default function authReducer(state = initialState, action = {}) {
  switch (action.type) {
    case SET_ACCESSIBLE_SYSTEM:
      return {
        ...state,
        accessible_system: action.payload
      };
    case DESTROY_AUTH_STATE:
      return {
        ...initialState,
        accessible_system: []
      };
    default:
      return state;
  }
}
