import { getVendorDocuments } from '../../config/vendorDocuments';
import { DataService } from '../../config/dataService';

class VendorServices {
  postLoginVendor(payload) {
    return DataService.post('vendor-portal/login', payload);
  }

  getAccountDetail() {
    return DataService.get('vendor-portal/me');
  }

  putAccountDetail(payload) {
    return DataService.put('vendor-portal/me', payload);
  }

  postChangePassword(payload) {
    return DataService.post('vendor-portal/change-password', payload);
  }

  postReuploadDocument(documentId, payload) {
    const formData = new FormData();
    formData.append('notes', payload.notes);
    formData.append('file', payload.file);
    return DataService.post(`vendor-portal/documents/${encodeURIComponent(documentId)}/reupload`, formData);
  }

  getRatesHeader(params = {}) {
    return DataService.get('vendor-portal/rates/headers', params);
  }

  getDetailBatch(batchId) {
    return DataService.get(`vendor-portal/rates/headers/${encodeURIComponent(batchId)}`);
  }

  postVendorRates(payload) {
    const formData = new FormData();
    formData.append('periode', payload.periode);
    formData.append('file', payload.file);
    return DataService.post('vendor-portal/rates/upload', formData);
  }

  getDocumentTemplate(template) {
    return DataService.getBlob(`vendor-portal/templates/${encodeURIComponent(template)}`);
  }

  getCheckEmail(email) {
    return DataService.get('vendor-portal/check-email', { email });
  }

  postRegisterVendor(payload, onUploadProgress) {
    const formData = new FormData();

    ['vendor_type', 'company_name', 'company_email', 'company_npwp', 'address', 'pic_name', 'pic_phone'].forEach((key) => {
      formData.append(key, payload[key]);
    });
    // Multipart fields are strings; encode the boolean as 1/0 for the API.
    formData.append('terms_agreed', payload.terms_agreed ? '1' : '0');
    getVendorDocuments(payload.vendor_type)
      .filter(({ key }) => payload[key])
      .forEach(({ key }, index) => {
        formData.append(`documents[${index}][document_type]`, key);
        formData.append(`documents[${index}][file]`, payload[key]);
      });

    return DataService.post('vendor-portal/register', formData, {}, { onUploadProgress });
  }
}

export default new VendorServices();
