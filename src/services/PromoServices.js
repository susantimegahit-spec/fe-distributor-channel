import { DataService } from '../config/dataService';

class PromoServices {
  getAllPromo() {
    return DataService.get('/claims/programs');
  }

  postPromo(payload) {
    return DataService.post('/claims/promo', payload);
  }
}

export default new PromoServices();
