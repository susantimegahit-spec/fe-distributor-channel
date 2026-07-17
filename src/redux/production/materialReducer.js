import MaterialServices from '../../services/production/MaterialServices';

const GET_ITEM_BEGIN = 'production/material/GET_ITEM_BEGIN';
const GET_ITEM_SUCCESS = 'production/material/GET_ITEM_SUCCESS';
const GET_ITEM_FAILURE = 'production/material/GET_ITEM_FAILURE';

const initialState = {
  items: [],
  loading: false,
  error: null
};

const getResponseList = (response) => {
  const payload = response?.data?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return [];
};

export const getItem = (search = '') => async (dispatch) => {
  dispatch({ type: GET_ITEM_BEGIN });

  try {
    const response = await MaterialServices.getMaterial(search);

    if (response?.data?.success === false) {
      throw new Error(response.data.message || 'Failed to fetch material data');
    }

    const items = getResponseList(response);
    dispatch({ type: GET_ITEM_SUCCESS, payload: items });

    return response;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Failed to fetch material data';

    dispatch({ type: GET_ITEM_FAILURE, payload: message });
    throw error;
  }
};

export default function materialReducer(state = initialState, action = {}) {
  switch (action.type) {
    case GET_ITEM_BEGIN:
      return {
        ...state,
        loading: true,
        error: null
      };
    case GET_ITEM_SUCCESS:
      return {
        ...state,
        items: action.payload,
        loading: false,
        error: null
      };
    case GET_ITEM_FAILURE:
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
