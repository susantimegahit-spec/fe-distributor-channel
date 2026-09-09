import { DataService } from '../../config/dataService';

class VendorManagementServices {
  getVendorRegister(params = {}) {
    return DataService.get('vendor-management/registrations', params);
  }
}

export default new VendorManagementServices();
