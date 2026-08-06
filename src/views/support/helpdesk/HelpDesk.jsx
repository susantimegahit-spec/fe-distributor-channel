import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import { useAlert } from '../../../utils/alertContext';
import { helpDeskCategories, helpDeskTickets, priorityMeta, statusMeta } from './mockData';
import './helpdesk.scss';

const allValue = 'ALL';

function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta.OPEN;

  return (
    <Badge bg={meta.bg} className="fw-semibold">
      <i className={`${meta.icon} me-1`} />
      {meta.label}
    </Badge>
  );
}

function PriorityLabel({ priority }) {
  const meta = priorityMeta[priority] || priorityMeta.LOW;

  return (
    <span className={`text-${meta.color} fw-semibold text-nowrap`}>
      <span className={`priority-dot bg-${meta.color}`} />
      {meta.label}
    </span>
  );
}

function TicketList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(allValue);
  const [category, setCategory] = useState(allValue);

  const tickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return helpDeskTickets.filter((ticket) => {
      const matchesSearch =
        !keyword || `${ticket.id} ${ticket.subject} ${ticket.requester} ${ticket.reference}`.toLowerCase().includes(keyword);
      const matchesStatus = status === allValue || ticket.status === status;
      const matchesCategory = category === allValue || ticket.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [category, search, status]);

  const stats = [
    { label: 'Active Tickets', value: 3, icon: 'ti ti-ticket', hint: 'Requires monitoring' },
    { label: 'Waiting for You', value: 1, icon: 'ti ti-user-question', hint: 'Reply required' },
    { label: 'Resolved This Month', value: 8, icon: 'ti ti-circle-check', hint: '+3 from last month' },
    { label: 'Support Satisfaction', value: '4.7', icon: 'ti ti-star', hint: 'Out of 5.0' }
  ];

  return (
    <Stack gap={3}>
      <Card className="helpdesk-hero">
        <div className="hero-content d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="hero-kicker mb-2">SM Connect Support Center</div>
            <h3 className="text-white mb-2">How can we help?</h3>
            <p className="mb-0 text-white-50">Create tickets, track progress, and discuss issues in one place.</p>
          </div>
          <Button as={Link} to="/enterprise/help-desk/create" variant="light" className="text-primary fw-semibold">
            <i className="ti ti-plus me-1" />
            Create New Ticket
          </Button>
        </div>
      </Card>

      <Row className="g-3">
        {stats.map((item) => (
          <Col sm={6} xl={3} key={item.label}>
            <Card className="helpdesk-stat">
              <Card.Body className="d-flex align-items-center gap-3">
                <span className="stat-icon">
                  <i className={item.icon} />
                </span>
                <div>
                  <div className="stat-value">{item.value}</div>
                  <div className="fw-semibold">{item.label}</div>
                  <small className="text-muted">{item.hint}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <MainCard
        title={
          <div>
            <h5 className="mb-0">My Tickets</h5>
            <span className="text-muted f-12">Track all your support requests.</span>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="helpdesk-filter p-3 m-3">
          <Row className="g-2">
            <Col lg={6}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="ti ti-search" />
                </InputGroup.Text>
                <Form.Control
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by ticket number, subject, or reference..."
                />
              </InputGroup>
            </Col>
            <Col sm={6} lg={3}>
              <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value={allValue}>All statuses</option>
                {Object.entries(statusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={6} lg={3}>
              <Form.Select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value={allValue}>All categories</option>
                {helpDeskCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </div>

        <div className="table-responsive">
          <Table hover align="middle" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Ticket</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Last Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/enterprise/help-desk/${ticket.id}`} className="ticket-subject d-block">
                      {ticket.subject}
                    </Link>
                    <small className="text-muted">{ticket.id}</small>
                  </td>
                  <td>
                    <div>{ticket.category}</div>
                    <small className="text-muted">{ticket.subcategory}</small>
                  </td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <PriorityLabel priority={ticket.priority} />
                  </td>
                  <td>{ticket.assignee}</td>
                  <td>{ticket.updatedAt}</td>
                  <td className="text-end">
                    <Button as={Link} to={`/enterprise/help-desk/${ticket.id}`} variant="light" size="sm">
                      <i className="ti ti-chevron-right" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!tickets.length && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5">
                    <i className="ti ti-ticket-off f-30 d-block mb-2" />
                    No tickets match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </MainCard>

      <Row className="g-3">
        <Col lg={8}>
          <MainCard title="Quick Help">
            <Row className="g-3">
              {helpDeskCategories.slice(0, 4).map((item) => (
                <Col sm={6} key={item.value}>
                  <Card className="category-card">
                    <Card.Body className="d-flex align-items-center gap-3">
                      <span className={`stat-icon bg-light-${item.color} text-${item.color}`}>
                        <i className={item.icon} />
                      </span>
                      <div>
                        <div className="fw-semibold">{item.label}</div>
                        <small className="text-muted">View guides and FAQs</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </MainCard>
        </Col>
        <Col lg={4}>
          <MainCard title="Service Hours">
            <Stack gap={3}>
              <div className="d-flex gap-3">
                <span className="stat-icon">
                  <i className="ti ti-clock" />
                </span>
                <div>
                  <div className="fw-semibold">Monday – Friday</div>
                  <div className="text-muted">08.00 – 17.00 WIB</div>
                </div>
              </div>
              <div className="rounded bg-light p-3">
                <small className="text-muted">
                  Critical incidents reported outside service hours can still be submitted and will enter the priority queue.
                </small>
              </div>
            </Stack>
          </MainCard>
        </Col>
      </Row>
    </Stack>
  );
}

function CreateTicket() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    category: '',
    module: '',
    subject: '',
    description: '',
    reference: '',
    impact: 'NORMAL'
  });

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const canSubmit = form.category && form.subject.trim() && form.description.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    showAlert('Mock ticket created successfully. No data has been sent to the backend.', 'success');
    navigate('/enterprise/help-desk/HD-MOCK-001');
  };

  return (
    <Stack gap={3}>
      <div>
        <Button as={Link} to="/enterprise/help-desk" variant="link" className="px-0 text-decoration-none">
          <i className="ti ti-arrow-left me-1" />
          Back to Help Desk
        </Button>
        <h4 className="mb-1">Create New Ticket</h4>
        <p className="text-muted mb-0">Provide complete information so our support team can help you faster.</p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col xl={8}>
            <Stack gap={3}>
              <div className="form-section">
                <h5 className="mb-1">Request Details</h5>
                <p className="text-muted f-12 mb-4">Fields marked with * are required.</p>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Category *</Form.Label>
                      <Form.Select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                        <option value="">Select a category</option>
                        {helpDeskCategories.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Related Module</Form.Label>
                      <Form.Select value={form.module} onChange={(event) => updateForm('module', event.target.value)}>
                        <option value="">Select a module</option>
                        <option>Order</option>
                        <option>Reward & Claim</option>
                        <option>Master Data</option>
                        <option>Setting</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Issue Subject *</Form.Label>
                      <Form.Control
                        value={form.subject}
                        onChange={(event) => updateForm('subject', event.target.value)}
                        placeholder="Example: Product price does not match when creating a PO"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Description *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        value={form.description}
                        onChange={(event) => updateForm('description', event.target.value)}
                        placeholder="Describe what happened, the steps already taken, and the expected result..."
                      />
                      <Form.Text>Include the exact error message if one appears.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Reference Number</Form.Label>
                      <Form.Control
                        value={form.reference}
                        onChange={(event) => updateForm('reference', event.target.value)}
                        placeholder="Order / claim number (optional)"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Impact</Form.Label>
                      <Form.Select value={form.impact} onChange={(event) => updateForm('impact', event.target.value)}>
                        <option value="LOW">Work is not disrupted</option>
                        <option value="NORMAL">Some work is disrupted</option>
                        <option value="HIGH">Core transactions are disrupted</option>
                        <option value="CRITICAL">Operations have stopped</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div className="form-section">
                <h5>Attachments</h5>
                <div className="upload-dropzone">
                  <i className="ti ti-cloud-upload f-28 d-block mb-2" />
                  <div className="fw-semibold">Drop files here or browse files</div>
                  <small>JPG, PNG, PDF, XLSX · maximum 5 files · 5 MB/file</small>
                  <div className="mt-3">
                    <Button type="button" variant="outline-primary" size="sm">
                      Browse Files
                    </Button>
                  </div>
                </div>
              </div>
            </Stack>
          </Col>
          <Col xl={4}>
            <MainCard title="Before You Submit">
              <Stack gap={3}>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Make sure the information and reference number are correct.</small>
                </div>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Attach a screenshot showing the complete error message.</small>
                </div>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Do not include passwords or other sensitive information.</small>
                </div>
                <hr className="my-1" />
                <Button type="submit" disabled={!canSubmit}>
                  <i className="ti ti-send me-1" />
                  Submit Ticket
                </Button>
                <Button type="button" variant="light" onClick={() => navigate('/enterprise/help-desk')}>
                  Cancel
                </Button>
              </Stack>
            </MainCard>
          </Col>
        </Row>
      </Form>
    </Stack>
  );
}

function TicketDetail() {
  const { ticketId } = useParams();
  const { showAlert } = useAlert();
  const ticket = helpDeskTickets.find((item) => item.id === ticketId) || {
    ...helpDeskTickets[0],
    id: ticketId,
    subject: 'New Help Desk ticket example',
    status: 'OPEN',
    messages: []
  };
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState(ticket.messages);

  const handleReply = () => {
    if (!reply.trim()) return;
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        sender: 'You',
        role: 'Distributor',
        initials: 'AN',
        time: 'Just now',
        body: reply.trim()
      }
    ]);
    setReply('');
    showAlert('Reply added to the mockup.', 'success');
  };

  return (
    <Stack gap={3}>
      <div>
        <Button as={Link} to="/enterprise/help-desk" variant="link" className="px-0 text-decoration-none">
          <i className="ti ti-arrow-left me-1" />
          Back to Help Desk
        </Button>
        <Stack direction="horizontal" gap={2} className="justify-content-between flex-wrap">
          <div>
            <div className="text-muted f-12 mb-1">{ticket.id}</div>
            <h4 className="mb-1">{ticket.subject}</h4>
            <small className="text-muted">
              Created {ticket.createdAt} by {ticket.requester}
            </small>
          </div>
          <StatusBadge status={ticket.status} />
        </Stack>
      </div>

      <Row className="g-3">
        <Col xl={8}>
          <Card className="ticket-conversation">
            <Card.Header>
              <h5 className="mb-0">Conversation</h5>
            </Card.Header>
            <Card.Body>
              {!messages.length && (
                <div className="rounded bg-light p-3 mb-4">
                  <div className="fw-semibold mb-1">{ticket.requester}</div>
                  <div>{ticket.description}</div>
                </div>
              )}
              {messages.map((message) => (
                <div className={`message-row ${message.agent ? 'agent' : ''}`} key={message.id}>
                  <div className="message-avatar">{message.initials}</div>
                  <div className="message-bubble">
                    <div className="d-flex justify-content-between gap-3 mb-1">
                      <span className="fw-semibold">
                        {message.sender} <small className="text-muted">· {message.role}</small>
                      </span>
                      <small className="text-muted text-nowrap">{message.time}</small>
                    </div>
                    <div>{message.body}</div>
                    {message.attachment && (
                      <Badge bg="light" text="dark" className="border mt-2">
                        <i className="ti ti-paperclip me-1" />
                        {message.attachment}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              <Form.Group>
                <Form.Label className="fw-semibold">Write a Reply</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Add information or ask about the ticket progress..."
                />
              </Form.Group>
              <Stack direction="horizontal" gap={2} className="justify-content-between mt-3">
                <Button variant="light" size="sm">
                  <i className="ti ti-paperclip me-1" />
                  Attach File
                </Button>
                <Button onClick={handleReply} disabled={!reply.trim()}>
                  <i className="ti ti-send me-1" />
                  Send Reply
                </Button>
              </Stack>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Stack gap={3}>
            <Card className="ticket-sidebar">
              <Card.Body>
                <h5>Ticket Information</h5>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Status</small>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Priority</small>
                  <PriorityLabel priority={ticket.priority} />
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Category</small>
                  <span className="fw-semibold">
                    {ticket.category} / {ticket.subcategory}
                  </span>
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Assignee</small>
                  <span className="fw-semibold">{ticket.assignee}</span>
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Reference Number</small>
                  <span className="fw-semibold">{ticket.reference}</span>
                </div>
              </Card.Body>
            </Card>

            <Card className="ticket-sidebar">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between mb-2">
                  <h5 className="mb-0">SLA Target</h5>
                  <Badge bg="success">On Track</Badge>
                </Stack>
                <small className="text-muted">Resolution target</small>
                <div className="fw-semibold mb-3">{ticket.dueAt}</div>
                <ProgressBar now={42} className="sla-progress" />
                <small className="text-muted d-block mt-2">42% of the SLA time has elapsed</small>
              </Card.Body>
            </Card>

            <Button
              variant="outline-success"
              onClick={() => showAlert('Ticket marked as resolved in the mockup. No backend data was changed.', 'success')}
            >
              <i className="ti ti-circle-check me-1" />
              Mark as Resolved
            </Button>
          </Stack>
        </Col>
      </Row>
    </Stack>
  );
}

export default function HelpDesk({ view = 'list' }) {
  return (
    <div className="helpdesk-page">
      {view === 'create' && <CreateTicket />}
      {view === 'detail' && <TicketDetail />}
      {view === 'list' && <TicketList />}
    </div>
  );
}
