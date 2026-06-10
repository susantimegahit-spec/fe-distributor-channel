import { DataService } from "../config/dataService";


class DistributorServices {
  getAllDistributor(payload) {
    return DataService.get(`/distributors?search=${payload}`);
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
