import { useMemo, useState } from 'react';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import { useAlert } from '../../utils/alertContext';

const storageKey = 'dc-document-builder-templates';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
  { value: 'textarea', label: 'Long Text' }
];

const defaultTemplate = {
  id: '',
  name: '',
  code: '',
  description: '',
  fields: []
};

const createField = () => ({
  id: `field-${Date.now()}`,
  label: '',
  key: '',
  type: 'text',
  required: false
});

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const readTemplates = () => {
  try {
    const savedValue = localStorage.getItem(storageKey);
    return savedValue ? JSON.parse(savedValue) : [];
  } catch (error) {
    return [];
  }
};

export default function DocumentBuilder() {
  const { showAlert } = useAlert();
  const [templates, setTemplates] = useState(readTemplates);
  const [template, setTemplate] = useState(defaultTemplate);

  const selectedTemplate = useMemo(() => templates.find((item) => item.id === template.id), [template.id, templates]);
  const hasFields = template.fields.length > 0;

  const persistTemplates = (nextTemplates) => {
    localStorage.setItem(storageKey, JSON.stringify(nextTemplates));
    setTemplates(nextTemplates);
  };

  const handleTemplateChange = (field, value) => {
    setTemplate((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !current.code ? { code: slugify(value).toUpperCase() } : {})
    }));
  };

  const handleFieldChange = (fieldId, key, value) => {
    setTemplate((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              [key]: value,
              ...(key === 'label' && !field.key ? { key: slugify(value) } : {})
            }
          : field
      )
    }));
  };

  const addField = () => {
    setTemplate((current) => ({
      ...current,
      fields: [...current.fields, createField()]
    }));
  };

  const removeField = (fieldId) => {
    setTemplate((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== fieldId)
    }));
  };

  const resetForm = () => {
    setTemplate(defaultTemplate);
  };

  const selectTemplate = (item) => {
    setTemplate({
      ...item,
      fields: Array.isArray(item.fields) ? item.fields : []
    });
  };

  const saveTemplate = (event) => {
    event.preventDefault();

    if (!template.name.trim()) {
      showAlert('Document name is required', 'danger');
      return;
    }

    if (!template.code.trim()) {
      showAlert('Document code is required', 'danger');
      return;
    }

    if (!hasFields) {
      showAlert('Add at least one document field', 'danger');
      return;
    }

    if (template.fields.some((field) => !field.label.trim() || !field.key.trim())) {
      showAlert('Each field needs a label and key', 'danger');
      return;
    }

    const templateId = template.id || `document-${Date.now()}`;
    const payload = {
      ...template,
      id: templateId,
      code: slugify(template.code).toUpperCase(),
      updatedAt: new Date().toISOString()
    };
    const nextTemplates = selectedTemplate
      ? templates.map((item) => (item.id === templateId ? payload : item))
      : [payload, ...templates];

    persistTemplates(nextTemplates);
    setTemplate(payload);
    showAlert('Document template saved successfully', 'success');
  };

  const deleteTemplate = (templateId) => {
    const nextTemplates = templates.filter((item) => item.id !== templateId);
    persistTemplates(nextTemplates);

    if (template.id === templateId) {
      resetForm();
    }

    showAlert('Document template deleted successfully', 'success');
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Document Builder</h5>
            <span className="text-muted f-12">Create reusable document templates with dynamic fields.</span>
          </Stack>
        }
        secondary={
          <Button variant="light-primary" onClick={resetForm}>
            <i className="ti ti-file-plus me-1" />
            New Template
          </Button>
        }
      >
        <Form onSubmit={saveTemplate}>
          <Row className="g-3">
            <Col lg={8}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="documentName">
                    <Form.Label className="fw-semibold">Document Name</Form.Label>
                    <Form.Control
                      value={template.name}
                      onChange={(event) => handleTemplateChange('name', event.target.value)}
                      placeholder="Example: Delivery Note"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="documentCode">
                    <Form.Label className="fw-semibold">Document Code</Form.Label>
                    <Form.Control
                      value={template.code}
                      onChange={(event) => handleTemplateChange('code', event.target.value)}
                      placeholder="DELIVERY_NOTE"
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="documentDescription">
                    <Form.Label className="fw-semibold">Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={template.description}
                      onChange={(event) => handleTemplateChange('description', event.target.value)}
                      placeholder="Describe how this document template will be used"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Col>
            <Col lg={4}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <Stack gap={2}>
                    <div className="text-muted f-12">Template Preview</div>
                    <h5 className="mb-0">{template.name || 'Untitled Document'}</h5>
                    <div className="text-muted">{template.code || 'DOCUMENT_CODE'}</div>
                    <Stack direction="horizontal" gap={2} className="flex-wrap">
                      {template.fields.map((field) => (
                        <Badge bg={field.required ? 'primary' : 'light'} text={field.required ? undefined : 'dark'} key={field.id}>
                          {field.key || 'field_key'}
                        </Badge>
                      ))}
                    </Stack>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border mb-0 mt-4">
            <Card.Header className="py-3">
              <Stack direction="horizontal" className="justify-content-between">
                <div>
                  <h6 className="mb-1">Dynamic Fields</h6>
                  <small className="text-muted">Fields become document variables that can be filled later.</small>
                </div>
                <Button size="sm" variant="light-primary" type="button" onClick={addField}>
                  <i className="ti ti-plus me-1" />
                  Add Field
                </Button>
              </Stack>
            </Card.Header>
            <Card.Body className="p-0">
              <Table className="mb-0 align-middle" responsive hover>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Label</th>
                    <th style={{ minWidth: 220 }}>Key</th>
                    <th style={{ minWidth: 170 }}>Type</th>
                    <th style={{ minWidth: 120 }}>Required</th>
                    <th className="text-center" style={{ width: 80 }}>
                      #
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hasFields ? (
                    template.fields.map((field) => (
                      <tr key={field.id}>
                        <td>
                          <Form.Control
                            value={field.label}
                            onChange={(event) => handleFieldChange(field.id, 'label', event.target.value)}
                            placeholder="Customer Name"
                            size="sm"
                          />
                        </td>
                        <td>
                          <InputGroup size="sm">
                            <InputGroup.Text>{'{{'}</InputGroup.Text>
                            <Form.Control
                              value={field.key}
                              onChange={(event) => handleFieldChange(field.id, 'key', slugify(event.target.value))}
                              placeholder="customer_name"
                            />
                            <InputGroup.Text>{'}}'}</InputGroup.Text>
                          </InputGroup>
                        </td>
                        <td>
                          <Form.Select
                            value={field.type}
                            onChange={(event) => handleFieldChange(field.id, 'type', event.target.value)}
                            size="sm"
                          >
                            {fieldTypes.map((item) => (
                              <option value={item.value} key={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Check
                            type="switch"
                            id={`document-field-required-${field.id}`}
                            checked={field.required}
                            onChange={(event) => handleFieldChange(field.id, 'required', event.target.checked)}
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            className="rounded-circle"
                            size="sm"
                            variant="outline-danger"
                            type="button"
                            onClick={() => removeField(field.id)}
                          >
                            <i className="ti ti-trash" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No dynamic fields yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Stack direction="horizontal" className="justify-content-end mt-4" gap={2}>
            <Button variant="light-secondary" type="button" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              <i className="ti ti-device-floppy me-1" />
              Save Template
            </Button>
          </Stack>
        </Form>
      </MainCard>

      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Document Templates</h5>
            <span className="text-muted f-12">Manage saved dynamic document templates.</span>
          </Stack>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Document</th>
              <th style={{ minWidth: 160 }}>Code</th>
              <th style={{ minWidth: 120 }}>Fields</th>
              <th style={{ minWidth: 160 }}>Updated</th>
              <th className="text-center" style={{ width: 120 }}>
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.length ? (
              templates.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                    <small className="text-muted">{item.description || '-'}</small>
                  </td>
                  <td>
                    <Badge bg="light" text="dark">
                      {item.code}
                    </Badge>
                  </td>
                  <td>{item.fields?.length || 0}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('en-US') : '-'}</td>
                  <td className="text-center">
                    <Stack direction="horizontal" gap={2} className="justify-content-center">
                      <Button className="rounded-circle" size="sm" variant="outline-primary" onClick={() => selectTemplate(item)}>
                        <i className="ti ti-pencil" />
                      </Button>
                      <Button className="rounded-circle" size="sm" variant="outline-danger" onClick={() => deleteTemplate(item.id)}>
                        <i className="ti ti-trash" />
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No document templates saved yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>
    </Stack>
  );
}
