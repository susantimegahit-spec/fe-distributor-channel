import { combineReducers } from 'redux';
import auth from './authReducer';
import productionMaterial from './production/materialReducer';
import productionResource from './production/resourceReducer';


const rootReducers = combineReducers({
  auth,
  productionMaterial,
  productionResource
});

export default rootReducers;
