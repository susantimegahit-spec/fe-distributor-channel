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
    { label: 'Tiket Aktif', value: 3, icon: 'ti ti-ticket', hint: 'Perlu dipantau' },
    { label: 'Menunggu Anda', value: 1, icon: 'ti ti-user-question', hint: 'Butuh balasan' },
    { label: 'Selesai Bulan Ini', value: 8, icon: 'ti ti-circle-check', hint: '+3 dari bulan lalu' },
    { label: 'Kepuasan Bantuan', value: '4,7', icon: 'ti ti-star', hint: 'Dari 5,0' }
  ];

  return (
    <Stack gap={3}>
      <Card className="helpdesk-hero">
        <div className="hero-content d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="hero-kicker mb-2">SM Connect Support Center</div>
            <h3 className="text-white mb-2">Ada yang bisa kami bantu?</h3>
            <p className="mb-0 text-white-50">Buat tiket, pantau progres, dan diskusikan kendala dalam satu tempat.</p>
          </div>
          <Button as={Link} to="/support/help-desk/create" variant="light" className="text-primary fw-semibold">
            <i className="ti ti-plus me-1" />
            Buat Tiket Baru
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
            <h5 className="mb-0">Tiket Saya</h5>
            <span className="text-muted f-12">Pantau seluruh permintaan bantuan Anda.</span>
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
                  placeholder="Cari nomor, judul, atau referensi tiket..."
                />
              </InputGroup>
            </Col>
            <Col sm={6} lg={3}>
              <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value={allValue}>Semua status</option>
                {Object.entries(statusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col sm={6} lg={3}>
              <Form.Select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value={allValue}>Semua kategori</option>
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
                <th>Tiket</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Prioritas</th>
                <th>PIC</th>
                <th>Update Terakhir</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/support/help-desk/${ticket.id}`} className="ticket-subject d-block">
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
                    <Button as={Link} to={`/support/help-desk/${ticket.id}`} variant="light" size="sm">
                      <i className="ti ti-chevron-right" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!tickets.length && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5">
                    <i className="ti ti-ticket-off f-30 d-block mb-2" />
                    Tidak ada tiket yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </MainCard>

      <Row className="g-3">
        <Col lg={8}>
          <MainCard title="Bantuan Cepat">
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
                        <small className="text-muted">Lihat panduan dan FAQ</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </MainCard>
        </Col>
        <Col lg={4}>
          <MainCard title="Jam Layanan">
            <Stack gap={3}>
              <div className="d-flex gap-3">
                <span className="stat-icon">
                  <i className="ti ti-clock" />
                </span>
                <div>
                  <div className="fw-semibold">Senin – Jumat</div>
                  <div className="text-muted">08.00 – 17.00 WIB</div>
                </div>
              </div>
              <div className="rounded bg-light p-3">
                <small className="text-muted">
                  Untuk gangguan kritis di luar jam layanan, tiket tetap dapat dibuat dan akan masuk antrean prioritas.
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

    showAlert('Mockup tiket berhasil dibuat. Data belum dikirim ke backend.', 'success');
    navigate('/support/help-desk/HD-MOCK-001');
  };

  return (
    <Stack gap={3}>
      <div>
        <Button as={Link} to="/support/help-desk" variant="link" className="px-0 text-decoration-none">
          <i className="ti ti-arrow-left me-1" />
          Kembali ke Help Desk
        </Button>
        <h4 className="mb-1">Buat Tiket Baru</h4>
        <p className="text-muted mb-0">Berikan informasi lengkap agar tim support dapat membantu lebih cepat.</p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col xl={8}>
            <Stack gap={3}>
              <div className="form-section">
                <h5 className="mb-1">Detail Permintaan</h5>
                <p className="text-muted f-12 mb-4">Kolom bertanda * wajib diisi.</p>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Kategori *</Form.Label>
                      <Form.Select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                        <option value="">Pilih kategori</option>
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
                      <Form.Label className="fw-semibold">Terkait Modul</Form.Label>
                      <Form.Select value={form.module} onChange={(event) => updateForm('module', event.target.value)}>
                        <option value="">Pilih modul</option>
                        <option>Order</option>
                        <option>Reward & Claim</option>
                        <option>Master Data</option>
                        <option>Setting</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Judul Masalah *</Form.Label>
                      <Form.Control
                        value={form.subject}
                        onChange={(event) => updateForm('subject', event.target.value)}
                        placeholder="Contoh: Harga produk tidak sesuai saat membuat PO"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Deskripsi *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        value={form.description}
                        onChange={(event) => updateForm('description', event.target.value)}
                        placeholder="Jelaskan apa yang terjadi, langkah yang sudah dilakukan, dan hasil yang diharapkan..."
                      />
                      <Form.Text>Tuliskan pesan error persis seperti yang tampil jika ada.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Nomor Referensi</Form.Label>
                      <Form.Control
                        value={form.reference}
                        onChange={(event) => updateForm('reference', event.target.value)}
                        placeholder="Nomor order / claim (opsional)"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Dampak</Form.Label>
                      <Form.Select value={form.impact} onChange={(event) => updateForm('impact', event.target.value)}>
                        <option value="LOW">Tidak menghambat pekerjaan</option>
                        <option value="NORMAL">Sebagian pekerjaan terhambat</option>
                        <option value="HIGH">Transaksi utama terhambat</option>
                        <option value="CRITICAL">Operasional berhenti</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div className="form-section">
                <h5>Lampiran</h5>
                <div className="upload-dropzone">
                  <i className="ti ti-cloud-upload f-28 d-block mb-2" />
                  <div className="fw-semibold">Tarik file ke sini atau pilih file</div>
                  <small>JPG, PNG, PDF, XLSX · maksimum 5 file · 5 MB/file</small>
                  <div className="mt-3">
                    <Button type="button" variant="outline-primary" size="sm">
                      Pilih File
                    </Button>
                  </div>
                </div>
              </div>
            </Stack>
          </Col>
          <Col xl={4}>
            <MainCard title="Sebelum Mengirim">
              <Stack gap={3}>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Pastikan informasi dan nomor referensi sudah benar.</small>
                </div>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Lampirkan screenshot yang memperlihatkan seluruh pesan error.</small>
                </div>
                <div className="d-flex gap-2">
                  <i className="ti ti-circle-check text-success mt-1" />
                  <small>Hindari mencantumkan password atau informasi sensitif.</small>
                </div>
                <hr className="my-1" />
                <Button type="submit" disabled={!canSubmit}>
                  <i className="ti ti-send me-1" />
                  Kirim Tiket
                </Button>
                <Button type="button" variant="light" onClick={() => navigate('/support/help-desk')}>
                  Batal
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
    subject: 'Contoh tiket Help Desk baru',
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
        sender: 'Anda',
        role: 'Distributor',
        initials: 'AN',
        time: 'Baru saja',
        body: reply.trim()
      }
    ]);
    setReply('');
    showAlert('Balasan ditambahkan pada mockup.', 'success');
  };

  return (
    <Stack gap={3}>
      <div>
        <Button as={Link} to="/support/help-desk" variant="link" className="px-0 text-decoration-none">
          <i className="ti ti-arrow-left me-1" />
          Kembali ke Help Desk
        </Button>
        <Stack direction="horizontal" gap={2} className="justify-content-between flex-wrap">
          <div>
            <div className="text-muted f-12 mb-1">{ticket.id}</div>
            <h4 className="mb-1">{ticket.subject}</h4>
            <small className="text-muted">
              Dibuat {ticket.createdAt} oleh {ticket.requester}
            </small>
          </div>
          <StatusBadge status={ticket.status} />
        </Stack>
      </div>

      <Row className="g-3">
        <Col xl={8}>
          <Card className="ticket-conversation">
            <Card.Header>
              <h5 className="mb-0">Percakapan</h5>
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
                <Form.Label className="fw-semibold">Tulis Balasan</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Tambahkan informasi atau tanyakan progres tiket..."
                />
              </Form.Group>
              <Stack direction="horizontal" gap={2} className="justify-content-between mt-3">
                <Button variant="light" size="sm">
                  <i className="ti ti-paperclip me-1" />
                  Lampirkan File
                </Button>
                <Button onClick={handleReply} disabled={!reply.trim()}>
                  <i className="ti ti-send me-1" />
                  Kirim Balasan
                </Button>
              </Stack>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={4}>
          <Stack gap={3}>
            <Card className="ticket-sidebar">
              <Card.Body>
                <h5>Informasi Tiket</h5>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Status</small>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Prioritas</small>
                  <PriorityLabel priority={ticket.priority} />
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Kategori</small>
                  <span className="fw-semibold">
                    {ticket.category} / {ticket.subcategory}
                  </span>
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">PIC</small>
                  <span className="fw-semibold">{ticket.assignee}</span>
                </div>
                <div className="ticket-meta-row">
                  <small className="text-muted d-block">Nomor Referensi</small>
                  <span className="fw-semibold">{ticket.reference}</span>
                </div>
              </Card.Body>
            </Card>

            <Card className="ticket-sidebar">
              <Card.Body>
                <Stack direction="horizontal" className="justify-content-between mb-2">
                  <h5 className="mb-0">Target SLA</h5>
                  <Badge bg="success">Terpenuhi</Badge>
                </Stack>
                <small className="text-muted">Target penyelesaian</small>
                <div className="fw-semibold mb-3">{ticket.dueAt}</div>
                <ProgressBar now={42} className="sla-progress" />
                <small className="text-muted d-block mt-2">42% waktu SLA telah digunakan</small>
              </Card.Body>
            </Card>

            <Button
              variant="outline-success"
              onClick={() => showAlert('Tiket ditandai selesai pada mockup. Tidak ada data backend yang berubah.', 'success')}
            >
              <i className="ti ti-circle-check me-1" />
              Tandai Selesai
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
