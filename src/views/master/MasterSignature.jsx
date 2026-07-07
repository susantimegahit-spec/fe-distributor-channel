import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import LoaderData from '../../components/LoaderData';
import { useAlert } from '../../utils/alertContext';
import PiSettingServices from '../../services/PiSettingServices';
import UserServices from '../../services/UserServices';
import { getCookies } from '../../utils/cookies';

const adminRoleId = 5;

const documentTagOptions = [
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'SALES_ORDER', label: 'Sales Order' },
  { value: 'DELIVERY_ORDER', label: 'Surat Jalan' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'RECEIPT', label: 'Kwitansi' }
];

const normalizeDocumentTags = (value) => {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : item?.value)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value);
      return normalizeDocumentTags(parsedValue);
    } catch (error) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

export default function MasterSignature() {
  const { showAlert } = useAlert();
  const roleId = getCookies('role');
  const loggedInUserId = getCookies('id');
  const loggedInUserName = getCookies('name');
  const loggedInUserEmail = getCookies('email');
  const isAdministrator = Number(roleId) === adminRoleId;

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(loggedInUserId || '');
  const [signerName, setSignerName] = useState(loggedInUserName || '');
  const [signerTitle, setSignerTitle] = useState('');
  const [documentTags, setDocumentTags] = useState([]);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.name || user.username || user.email || `User ${user.id}`,
        email: user.email || '',
        username: user.username || ''
      })),
    [users]
  );

  const selectedUserOption =
    userOptions.find((option) => String(option.value) === String(selectedUserId)) ||
    (selectedUserId
      ? {
          value: selectedUserId,
          label: loggedInUserName || loggedInUserEmail || `User ${selectedUserId}`,
          email: loggedInUserEmail || ''
        }
      : null);

  const selectedDocumentTags = useMemo(
    () => documentTagOptions.filter((option) => documentTags.includes(option.value)),
    [documentTags]
  );

  useEffect(() => {
    if (isAdministrator) {
      fetchUsers();
    }
  }, [isAdministrator]);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchData(selectedUserId);
  }, [selectedUserId, userOptions.length]);

  const getFallbackSignerName = (userId = selectedUserId) => {
    if (!isAdministrator) return loggedInUserName || '';

    const selectedUser = userOptions.find((option) => String(option.value) === String(userId));
    return selectedUser?.label || '';
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await UserServices.getAllUser();
      if (response?.data?.success) {
        setUsers(response.data.data || []);
      } else {
        showAlert(response?.data?.message || 'Failed to fetch user data', 'danger');
      }
    } catch (error) {
      showAlert('An error occurred while loading user data', 'danger');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchData = async (userId = selectedUserId) => {
    setLoading(true);
    try {
      const response = await PiSettingServices.getSetting({ user_id: userId });
      if (response?.data?.success) {
        const data = response.data.data || {};
        setSignerName(data.signer_name || getFallbackSignerName(userId));
        setSignerTitle(data.signer_title || '');
        setDocumentTags(normalizeDocumentTags(data.document_tags || data.documentTags || data.tags));
        setSignatureUrl(data.signature_url || '');
        setSelectedFile(null);
        setPreviewUrl('');
      } else {
        showAlert('Failed to fetch configuration data', 'danger');
      }
    } catch (error) {
      showAlert('An error occurred while loading data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSelectUser = (option) => {
    if (!option) {
      setSelectedUserId('');
      setSignerName('');
      setSignerTitle('');
      setDocumentTags([]);
      setSignatureUrl('');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedUserId(option.value);
    setSignerName(option.label || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      showAlert('Select a user first', 'warning');
      return;
    }
    if (!signerName.trim()) {
      showAlert('Signer name is required', 'warning');
      return;
    }
    // if (!signerTitle.trim()) {
    //   showAlert('Signer position is required', 'warning');
    //   return;
    // }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('user_id', selectedUserId);
      formData.append('signer_name', signerName);
      formData.append('signer_title', signerTitle);
      formData.append('document_tags', JSON.stringify(documentTags));
      documentTags.forEach((tag) => formData.append('document_tags[]', tag));
      if (selectedFile) {
        formData.append('signature_file', selectedFile);
      }

      const response = await PiSettingServices.updateSetting(formData);
      if (response?.data?.success) {
        showAlert('PI signature configuration updated successfully', 'success');
        setSelectedFile(null);
        setPreviewUrl('');
        // Reload data to get latest signature_url
        fetchData(selectedUserId);
      } else {
        showAlert(response?.data?.message || 'Failed to update configuration', 'danger');
      }
    } catch (error) {
      showAlert('An error occurred while saving data', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingUsers) {
    return (
      <MainCard title="Setting TTD PI">
        <LoaderData />
      </MainCard>
    );
  }

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Setting TTD Proforma Invoice</h5>
            <span className="text-muted f-12">Manage the name, position, and digital signature image displayed on the Proforma Invoice.</span>
          </Stack>
        }
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            <Col lg={7}>
              <Stack gap={3}>
                {isAdministrator && (
                  <Form.Group controlId="signatureUser">
                    <Form.Label className="fw-semibold">User</Form.Label>
                    <Select
                      value={selectedUserOption}
                      options={userOptions}
                      menuPosition="fixed"
                      onChange={handleSelectUser}
                      placeholder="Search nama user"
                      isClearable
                      isSearchable
                      formatOptionLabel={(option) => (
                        <div>
                          <div className="fw-semibold">{option.label}</div>
                          {option.email && <small className="text-muted">{option.email}</small>}
                        </div>
                      )}
                    />
                  </Form.Group>
                )}

                <Form.Group controlId="signerName">
                  <Form.Label className="fw-semibold">Signer Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Contoh: Kushan Wijono"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                  />
                </Form.Group>

                {/* <Form.Group controlId="signerTitle">
                  <Form.Label className="fw-semibold">Signer Position</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Contoh: Branch Manager"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    required
                  />
                </Form.Group>
 */}
                <Form.Group controlId="documentTags">
                  <Form.Label className="fw-semibold">Document Tag</Form.Label>
                  <Select
                    isMulti
                    value={selectedDocumentTags}
                    options={documentTagOptions}
                    menuPosition="fixed"
                    onChange={(options) => setDocumentTags((options || []).map((option) => option.value))}
                    placeholder="Select document tag"
                    closeMenuOnSelect={false}
                  />
                </Form.Group>

                <Form.Group controlId="signatureFile">
                  <Form.Label className="fw-semibold">Gambar Tanda Tangan (JPEG/PNG/WebP)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                  <Form.Text className="text-muted">
                    Format gambar yang didukung: JPEG, PNG, WebP. Maksimal ukuran file 2MB. Gambar akan otomatis dikonversi ke JPEG dengan latar belakang putih.
                  </Form.Text>
                </Form.Group>

                <div className="mt-2">
                  <Button type="submit" variant="primary" disabled={saving || !selectedUserId}>
                    {saving ? (
                      <>
                        <i className="ti ti-loader-2 me-1 spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-1" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </Stack>
            </Col>

            <Col lg={5}>
              <Card className="border">
                <Card.Header className="py-3 bg-light">
                  <h6 className="mb-0">Pratinjau Tanda Tangan</h6>
                </Card.Header>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4" style={{ minHeight: 200 }}>
                  {previewUrl ? (
                    <div className="text-center">
                      <div className="mb-2 text-primary f-12 fw-semibold">New Signature (Not Saved Yet)</div>
                      <img
                        src={previewUrl}
                        alt="Tanda Tangan Baru"
                        className="img-fluid border p-2 bg-white"
                        style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : signatureUrl ? (
                    <div className="text-center">
                      <div className="mb-2 text-success f-12 fw-semibold">Tanda Tangan Saat Ini</div>
                      <img
                        src={signatureUrl}
                        alt="Tanda Tangan Saat Ini"
                        className="img-fluid border p-2 bg-white"
                        style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted">
                      <i className="ti ti-signature f-40 d-block mb-2 text-light-muted" />
                      No signature image has been uploaded yet.
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      </MainCard>
    </Stack>
  );
}
