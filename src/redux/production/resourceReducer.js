import ResourceServices from '../../services/production/ResourceServices';

const GET_RESOURCE_BEGIN = 'production/resource/GET_RESOURCE_BEGIN';
const GET_RESOURCE_SUCCESS = 'production/resource/GET_RESOURCE_SUCCESS';
const GET_RESOURCE_FAILURE = 'production/resource/GET_RESOURCE_FAILURE';

const initialState = {
  items: [],
  loading: false,
  error: null
};

const getResponseList = (response) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.resources)) return payload.resources;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return [];
};

export const getResource = (search = '') => async (dispatch) => {
  dispatch({ type: GET_RESOURCE_BEGIN });

  try {
    const response = await ResourceServices.getResource(search);

    if (response?.data?.success === false) {
      throw new Error(response.data.message || 'Failed to fetch resource data');
    }

    dispatch({ type: GET_RESOURCE_SUCCESS, payload: getResponseList(response) });

    return response;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Failed to fetch resource data';

    dispatch({ type: GET_RESOURCE_FAILURE, payload: message });
    throw error;
  }
};

export default function resourceReducer(state = initialState, action = {}) {
  switch (action.type) {
    case GET_RESOURCE_BEGIN:
      return {
        ...state,
        loading: true,
        error: null
      };
    case GET_RESOURCE_SUCCESS:
      return {
        ...state,
        items: action.payload,
        loading: false,
        error: null
      };
    case GET_RESOURCE_FAILURE:
      return {
        ...state,
        items: [],
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
}
