import ProductionServices from '../../services/production/ProductionServices';

const FETCH_BEGIN = 'production/receipt-pdo/FETCH_BEGIN';
const FETCH_SUCCESS = 'production/receipt-pdo/FETCH_SUCCESS';
const FETCH_FAILURE = 'production/receipt-pdo/FETCH_FAILURE';
const SET_FILTERS = 'production/receipt-pdo/SET_FILTERS';
const SET_SEARCH = 'production/receipt-pdo/SET_SEARCH';
const SET_SELECTED_IDS = 'production/receipt-pdo/SET_SELECTED_IDS';
const TOGGLE_SELECTED_ID = 'production/receipt-pdo/TOGGLE_SELECTED_ID';

const initialState = {
  items: [],
  filters: { from: '', to: '', unit: '' },
  search: '',
  selectedIds: [],
  loading: false,
  error: null,
  initialized: false
};

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'rows', 'boms', 'orders', 'production_orders', 'value', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

export const setReceiptPdoFilters = (filters) => ({ type: SET_FILTERS, payload: filters });
export const setReceiptPdoSearch = (search) => ({ type: SET_SEARCH, payload: search });
export const setReceiptPdoSelectedIds = (ids) => ({ type: SET_SELECTED_IDS, payload: ids.map(String) });
export const toggleReceiptPdo = (id, isChecked) => ({ type: TOGGLE_SELECTED_ID, payload: { id: String(id), isChecked } });

export const fetchReceiptPdos =
  (filters, search = '') =>
  async (dispatch) => {
    dispatch({ type: FETCH_BEGIN });
    try {
      const response = await ProductionServices.getListOrderSap({
        from: filters.from || '',
        to: filters.to || '',
        whs_code: '',
        to_whs_code: '',
        status: 'Release',
        unit: filters.unit || ''
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch Production Order data');

      dispatch({ type: FETCH_SUCCESS, payload: getResponseList(response) });
      dispatch(setReceiptPdoFilters(filters));
      dispatch(setReceiptPdoSearch(search));
      return response;
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch Production Order data';
      dispatch({ type: FETCH_FAILURE, payload: message });
      throw error;
    }
  };

export default function receiptPdoReducer(state = initialState, action = {}) {
  switch (action.type) {
    case FETCH_BEGIN:
      return { ...state, loading: true, error: null };
    case FETCH_SUCCESS:
      return { ...state, items: action.payload, loading: false, error: null, initialized: true };
    case FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case SET_FILTERS:
      return { ...state, filters: action.payload };
    case SET_SEARCH:
      return { ...state, search: action.payload };
    case SET_SELECTED_IDS:
      return { ...state, selectedIds: [...new Set(action.payload)] };
    case TOGGLE_SELECTED_ID:
      return {
        ...state,
        selectedIds: action.payload.isChecked
          ? [...new Set([...state.selectedIds, action.payload.id])]
          : state.selectedIds.filter((id) => id !== action.payload.id)
      };
    default:
      return state;
  }
}
