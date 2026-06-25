import { useEffect, useState } from 'react';

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

export default function MasterSignature() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await PiSettingServices.getSetting();
      if (response?.data?.success) {
        const data = response.data.data;
        setSignerName(data.signer_name || '');
        setSignerTitle(data.signer_title || '');
        setSignatureUrl(data.signature_url || '');
      } else {
        showAlert('Gagal mengambil data konfigurasi', 'danger');
      }
    } catch (error) {
      showAlert('Terjadi kesalahan saat memuat data', 'danger');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      showAlert('Nama penandatangan wajib diisi', 'warning');
      return;
    }
    if (!signerTitle.trim()) {
      showAlert('Jabatan penandatangan wajib diisi', 'warning');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('signer_name', signerName);
      formData.append('signer_title', signerTitle);
      if (selectedFile) {
        formData.append('signature_file', selectedFile);
      }

      const response = await PiSettingServices.updateSetting(formData);
      if (response?.data?.success) {
        showAlert('Konfigurasi tanda tangan PI berhasil diperbarui', 'success');
        setSelectedFile(null);
        setPreviewUrl('');
        // Reload data to get latest signature_url
        fetchData();
      } else {
        showAlert(response?.data?.message || 'Gagal memperbarui konfigurasi', 'danger');
      }
    } catch (error) {
      showAlert('Terjadi kesalahan saat menyimpan data', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            <span className="text-muted f-12">Kelola nama, jabatan, serta gambar tanda tangan digital yang akan dicantumkan pada Proforma Invoice.</span>
          </Stack>
        }
      >
        <Form onSubmit={handleSubmit}>
          <Row className="g-4">
            <Col lg={7}>
              <Stack gap={3}>
                <Form.Group controlId="signerName">
                  <Form.Label className="fw-semibold">Nama Penandatangan</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Contoh: Kushan Wijono"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group controlId="signerTitle">
                  <Form.Label className="fw-semibold">Jabatan Penandatangan</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Contoh: Branch Manager"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    required
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
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? (
                      <>
                        <i className="ti ti-loader-2 me-1 spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-1" />
                        Simpan Perubahan
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
                      <div className="mb-2 text-primary f-12 fw-semibold">Tanda Tangan Baru (Belum Disimpan)</div>
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
                      Belum ada gambar tanda tangan diunggah.
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
