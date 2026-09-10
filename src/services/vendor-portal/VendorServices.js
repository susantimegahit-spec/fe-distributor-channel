import { DataService } from '../../config/dataService';

class VendorServices {
  postLoginVendor(payload) {
    return DataService.post('vendor-portal/login', payload);
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
    ['akta', 'nib', 'npwp', 'support'].forEach((key) => {
      if (payload[key]) formData.append(key, payload[key]);
    });

    return DataService.post('vendor-portal/register', formData, {}, { onUploadProgress });
  }
}

export default new VendorServices();
