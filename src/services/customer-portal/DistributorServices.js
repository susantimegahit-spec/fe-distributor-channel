import { DataService } from '../../config/dataService';
import { getAssignedCustomerCodes } from '../../utils/cookies';

const getDistributorCustomerCode = (distributor) =>
  distributor?.code_customer || distributor?.customer_code || distributor?.distributor_code || distributor?.card_code || '';


class DistributorServices {
  async getAllDistributor(payload) {
    const response = await DataService.get(`/distributors?search=${payload ?? ''}`);
    const assignedCustomerCodes = getAssignedCustomerCodes();
    const distributors = response?.data?.data;

    if (!assignedCustomerCodes.length || !Array.isArray(distributors)) {
      return response;
    }

    const assignedCustomerCodeSet = new Set(assignedCustomerCodes);

    return {
      ...response,
      data: {
        ...response.data,
        data: distributors.filter((distributor) => assignedCustomerCodeSet.has(String(getDistributorCustomerCode(distributor)).trim()))
      }
    };
  }

  syncDistributor() {
    return DataService.post('/distributors/sync');
  }

  getDetailDistributor(id) {
    return DataService.get(`/distributors/${id}`);
  }

  getOcrByType(type) {
    // 1 -> Cabang
    // 2 -> Unit
    // 3 -> Department
    return DataService.get(`/distributors/ocr-codes?type=${type}`);
  }

  getAddress(code) {
    // 1 -> Cabang
    // 2 -> Unit
    // 3 -> Department
    return DataService.get(`/distributors/addresses?card_code=${code}`);
  }


}

export default new DistributorServices();
