import { combineReducers } from 'redux';
import auth from './authReducer';
import productionMaterial from './production/materialReducer';
import productionResource from './production/resourceReducer';
import productionReceiptPdo from './production/receiptPdoReducer';

const rootReducers = combineReducers({
  auth,
  productionMaterial,
  productionResource,
  productionReceiptPdo
});

export default rootReducers;
