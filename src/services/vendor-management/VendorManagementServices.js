import { DataService } from '../../config/dataService';

class VendorManagementServices {
  getVendorRegister(params = {}) {
    return DataService.get('vendor-management/registrations', params);
  }

  getDetailVendor(id) {
    return DataService.get(`vendor-management/registrations/${id}`);
  }

  getPreviewDocument(documentId) {
    return DataService.getBlob(`vendor-management/documents/${encodeURIComponent(documentId)}/preview`);
  }

  postRevisionDocument(documentId, payload) {
    return DataService.post(`vendor-management/documents/${encodeURIComponent(documentId)}/revision`, payload);
  }

  postApproveVendor(id, payload) {
    return DataService.post(`vendor-management/registrations/${encodeURIComponent(id)}/approve`, payload);
  }

  postRejectVendor(id, payload) {
    return DataService.post(`vendor-management/registrations/${encodeURIComponent(id)}/reject`, payload);
  }
}

export default new VendorManagementServices();
