import { DataService } from '../../config/dataService';

class DestinationServices {
  getDestinations(params = {}) {
    return DataService.get('distributors/shiptos', params);
  }

  syncDestinations() {
    return DataService.post('distributors/shiptos/sync');
  }
}

export default new DestinationServices();
