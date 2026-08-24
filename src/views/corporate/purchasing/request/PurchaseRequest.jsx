import { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import PurchasingServices from '../../../../services/corporate/PurchasingServices';
import { getCookies } from '../../../../utils/cookies';
import { useAlert } from '../../../../utils/alertContext';
import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';

const metrics = [
  { label: 'Draft Requests', value: 0, variant: 'secondary', icon: 'ti ti-file-pencil' },
  { label: 'Waiting Approval', value: 0, variant: 'warning', icon: 'ti ti-clock' },
  { label: 'Approved', value: 0, variant: 'success', icon: 'ti ti-circle-check' },
  { label: 'Rejected', value: 0, variant: 'danger', icon: 'ti ti-circle-x' }
];

const today = () => new Date().toISOString().slice(0, 10);

const createLine = () => ({
  key: `${Date.now()}-${Math.random()}`,
  ItemCode: '',
  PQTReqDate: today(),
  Quantity: 1,
  UomEntry: '-1',
  UomCode: '-1',
  WhsCode: '',
  UnitMsr: 'Pcs',
  FreeTxt: '',
  OcrCode: '',
  OcrCode2: '',
  OcrCode3: ''
});

const createInitialForm = () => ({
  Series: '',
  ReqType: '12',
  Requester: '',
  RequesterName: '',
  Department: '',
  DocDate: today(),
  DocDueDate: today(),
  Comments: '',
  UserId: String(getCookies('id') ?? ''),
  AddonId: String(getCookies('addonId') ?? ''),
  Lines: [createLine()]
});

export default function PurchaseRequest() {
  const { showAlert } = useAlert();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createInitialForm);

  const openNewRequest = () => {
    setForm(createInitialForm());
    setShowForm(true);
  };

  const closeForm = () => {
    if (!saving) setShowForm(false);
  };

  const updateHeader = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      Lines: current.Lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    }));
  };

  const addLine = () => {
    setForm((current) => ({ ...current, Lines: [...current.Lines, createLine()] }));
  };

  const removeLine = (index) => {
    setForm((current) => ({
      ...current,
      Lines: current.Lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  };

  const validate = () => {
    const requiredHeader = [
      ['Series', 'Series'],
      ['ReqType', 'Request type'],
      ['Requester', 'Requester'],
      ['RequesterName', 'Requester name'],
      ['Department', 'Department'],
      ['DocDate', 'Document date'],
      ['DocDueDate', 'Required date'],
      ['UserId', 'User ID'],
      ['AddonId', 'Addon ID']
    ];
    const missingHeader = requiredHeader.find(([field]) => !String(form[field] ?? '').trim());
    if (missingHeader) return `${missingHeader[1]} is required`;
    if (!form.Lines.length) return 'At least one request line is required';

    const invalidLine = form.Lines.findIndex(
      (line) =>
        !String(line.ItemCode ?? '').trim() ||
        !String(line.PQTReqDate ?? '').trim() ||
        !(Number(line.Quantity) > 0) ||
        !String(line.WhsCode ?? '').trim()
    );
    if (invalidLine >= 0) return `Complete item code, required date, quantity, and warehouse on line ${invalidLine + 1}`;
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      showAlert(validationMessage, 'warning');
      return;
    }

    const payload = {
      Series: form.Series.trim(),
      ReqType: form.ReqType.trim(),
      Requester: form.Requester.trim(),
      RequesterName: form.RequesterName.trim(),
      Department: form.Department.trim(),
      DocDate: form.DocDate,
      DocDueDate: form.DocDueDate,
      Comments: form.Comments.trim(),
      UserId: form.UserId.trim(),
      AddonId: form.AddonId.trim(),
      Lines: form.Lines.map(({ key, ...line }) => ({
        ...line,
        ItemCode: line.ItemCode.trim(),
        Quantity: Number(line.Quantity),
        FreeTxt: line.FreeTxt.trim()
      }))
    };

    setSaving(true);
    try {
      const response = await PurchasingServices.postPurchasing(payload);
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to create purchase request');
      }
      showAlert(response?.data?.message || 'Purchase request created successfully', 'success');
      setShowForm(false);
      setForm(createInitialForm());
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create purchase request', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EnterpriseWorkspace
        title="Purchase Request"
        description="Create, review, and monitor internal purchasing requests through the approval workflow."
        icon="ti ti-file-description"
        actionLabel="New Request"
        onAction={openNewRequest}
        metrics={metrics}
        columns={['Request No.', 'Request Date', 'Department', 'Requester', 'Amount', 'Status', 'Action']}
        emptyMessage="Purchase requests will appear here after they are created."
      />

      <Modal show={showForm} onHide={closeForm} backdrop="static" size="xl" centered scrollable>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>New Purchase Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form id="purchase-request-form" onSubmit={handleSubmit}>
            <h6 className="mb-3">Request Information</h6>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>Series</Form.Label>
                <Form.Control value={form.Series} onChange={(event) => updateHeader('Series', event.target.value)} required />
              </Col>
              <Col md={3}>
                <Form.Label>Request Type</Form.Label>
                <Form.Control value={form.ReqType} onChange={(event) => updateHeader('ReqType', event.target.value)} required />
              </Col>
              <Col md={3}>
                <Form.Label>Requester</Form.Label>
                <Form.Control value={form.Requester} onChange={(event) => updateHeader('Requester', event.target.value)} required />
              </Col>
              <Col md={3}>
                <Form.Label>Requester Name</Form.Label>
                <Form.Control value={form.RequesterName} onChange={(event) => updateHeader('RequesterName', event.target.value)} required />
              </Col>
              <Col md={4}>
                <Form.Label>Department</Form.Label>
                <Form.Control value={form.Department} onChange={(event) => updateHeader('Department', event.target.value)} required />
              </Col>
              <Col md={4}>
                <Form.Label>Document Date</Form.Label>
                <Form.Control type="date" value={form.DocDate} onChange={(event) => updateHeader('DocDate', event.target.value)} required />
              </Col>
              <Col md={4}>
                <Form.Label>Required Date</Form.Label>
                <Form.Control
                  type="date"
                  min={form.DocDate}
                  value={form.DocDueDate}
                  onChange={(event) => updateHeader('DocDueDate', event.target.value)}
                  required
                />
              </Col>
              <Col md={3}>
                <Form.Label>User ID</Form.Label>
                <Form.Control value={form.UserId} onChange={(event) => updateHeader('UserId', event.target.value)} required />
              </Col>
              <Col md={3}>
                <Form.Label>Addon ID</Form.Label>
                <Form.Control value={form.AddonId} onChange={(event) => updateHeader('AddonId', event.target.value)} required />
              </Col>
              <Col md={6}>
                <Form.Label>Comments</Form.Label>
                <Form.Control value={form.Comments} onChange={(event) => updateHeader('Comments', event.target.value)} />
              </Col>
            </Row>

            <Stack direction="horizontal" className="justify-content-between mt-4 mb-3">
              <h6 className="mb-0">Request Lines</h6>
              <Button type="button" size="sm" variant="outline-primary" onClick={addLine}>
                <i className="ti ti-plus me-1" /> Add Item
              </Button>
            </Stack>

            {form.Lines.map((line, index) => (
              <div className="border rounded p-3 mb-3" key={line.key}>
                <Stack direction="horizontal" className="justify-content-between mb-3">
                  <span className="fw-semibold">Item {index + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline-danger"
                    disabled={form.Lines.length === 1}
                    onClick={() => removeLine(index)}
                  >
                    <i className="ti ti-trash" />
                  </Button>
                </Stack>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label>Item Code</Form.Label>
                    <Form.Control value={line.ItemCode} onChange={(event) => updateLine(index, 'ItemCode', event.target.value)} required />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Required Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={line.PQTReqDate}
                      onChange={(event) => updateLine(index, 'PQTReqDate', event.target.value)}
                      required
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.Quantity}
                      onChange={(event) => updateLine(index, 'Quantity', event.target.value)}
                      required
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>UoM Entry</Form.Label>
                    <Form.Control value={line.UomEntry} onChange={(event) => updateLine(index, 'UomEntry', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>UoM Code</Form.Label>
                    <Form.Control value={line.UomCode} onChange={(event) => updateLine(index, 'UomCode', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Unit</Form.Label>
                    <Form.Control value={line.UnitMsr} onChange={(event) => updateLine(index, 'UnitMsr', event.target.value)} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Warehouse</Form.Label>
                    <Form.Control value={line.WhsCode} onChange={(event) => updateLine(index, 'WhsCode', event.target.value)} required />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Branch (OcrCode)</Form.Label>
                    <Form.Control value={line.OcrCode} onChange={(event) => updateLine(index, 'OcrCode', event.target.value)} />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Unit (OcrCode2)</Form.Label>
                    <Form.Control value={line.OcrCode2} onChange={(event) => updateLine(index, 'OcrCode2', event.target.value)} />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Department (OcrCode3)</Form.Label>
                    <Form.Control value={line.OcrCode3} onChange={(event) => updateLine(index, 'OcrCode3', event.target.value)} />
                  </Col>
                  <Col xs={12}>
                    <Form.Label>Line Remarks</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={line.FreeTxt}
                      onChange={(event) => updateLine(index, 'FreeTxt', event.target.value)}
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="light-secondary" onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="purchase-request-form" variant="primary" disabled={saving}>
            {saving ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-device-floppy me-1" />}
            Save Request
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
