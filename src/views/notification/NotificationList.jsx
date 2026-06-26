import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import LoaderData from '../../components/LoaderData';
import TablePagination from '../../components/TablePagination';
import NotificationServices from '../../services/NotificationServices';
import { useAlert } from '../../utils/alertContext';
import {
  getNotificationItems,
  getNotificationResponsePayload,
  getUnreadNotificationCount,
  normalizeNotification
} from '../../utils/notification';

const pageSize = 10;

const getNotificationUrl = (url) => {
  if (!url || url === '#') return '';
  return url;
};

export default function NotificationList() {
  const { showAlert } = useAlert();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingReadId, setMarkingReadId] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const response = await NotificationServices.getNotifications();
      const payload = getNotificationResponsePayload(response);
      const items = getNotificationItems(payload).map(normalizeNotification);

      setNotifications(items);
      setUnreadCount(getUnreadNotificationCount(payload, items));
      setCurrentPage(1);
    } catch (error) {
      showAlert(error?.message || 'Gagal memuat notifikasi', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keywords, statusFilter]);

  const filteredNotifications = useMemo(() => {
    const normalizedKeyword = keywords.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesKeyword =
        !normalizedKeyword ||
        notification.title.toLowerCase().includes(normalizedKeyword) ||
        notification.description.toLowerCase().includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'unread' && notification.unread) || (statusFilter === 'read' && !notification.unread);

      return matchesKeyword && matchesStatus;
    });
  }, [keywords, notifications, statusFilter]);

  const pageCount = Math.max(Math.ceil(filteredNotifications.length / pageSize), 1);
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredNotifications]);

  const markNotificationAsRead = async (notification) => {
    if (!notification?.id || !notification.unread) return;

    setMarkingReadId(notification.id);
    setNotifications((prevState) => prevState.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)));
    setUnreadCount((prevState) => Math.max(prevState - 1, 0));

    try {
      await NotificationServices.markAsRead(notification.id);
    } catch (error) {
      showAlert(error?.message || 'Gagal menandai notifikasi', 'danger');
      fetchNotifications();
    } finally {
      setMarkingReadId(null);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    setNotifications((prevState) => prevState.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);

    try {
      await NotificationServices.markAllAsRead();
      showAlert('Semua notifikasi ditandai sudah dibaca', 'success');
    } catch (error) {
      showAlert(error?.message || 'Gagal menandai semua notifikasi', 'danger');
      fetchNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <Stack gap={3}>
      <MainCard>
        <Stack direction="horizontal" className="justify-content-between align-items-start gap-3 flex-wrap mb-3">
          <div>
            <h4 className="mb-1">Notifikasi</h4>
            <small className="text-muted">{unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}</small>
          </div>
          <Stack direction="horizontal" gap={2}>
            <Button variant="light-primary" onClick={fetchNotifications} disabled={loading}>
              <i className="ti ti-refresh me-1" />
              Refresh
            </Button>
            <Button variant="primary" onClick={markAllAsRead} disabled={!unreadCount || markingAllRead}>
              {markingAllRead ? 'Memproses...' : 'Tandai Semua Dibaca'}
            </Button>
          </Stack>
        </Stack>

        <Stack direction="horizontal" className="justify-content-between align-items-center gap-3 flex-wrap mb-3">
          <InputGroup style={{ maxWidth: 360 }}>
            <InputGroup.Text>
              <i className="ti ti-search" />
            </InputGroup.Text>
            <Form.Control value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Cari notifikasi..." />
          </InputGroup>
          <ButtonGroup>
            <Button variant={statusFilter === 'all' ? 'primary' : 'light'} onClick={() => setStatusFilter('all')}>
              Semua
            </Button>
            <Button variant={statusFilter === 'unread' ? 'primary' : 'light'} onClick={() => setStatusFilter('unread')}>
              Belum Dibaca
            </Button>
            <Button variant={statusFilter === 'read' ? 'primary' : 'light'} onClick={() => setStatusFilter('read')}>
              Sudah Dibaca
            </Button>
          </ButtonGroup>
        </Stack>

        {loading ? (
          <LoaderData />
        ) : (
          <>
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Status</th>
                  <th>Notifikasi</th>
                  <th style={{ width: 190 }}>Waktu</th>
                  <th className="text-end" style={{ width: 180 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotifications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Tidak ada notifikasi.
                    </td>
                  </tr>
                ) : (
                  paginatedNotifications.map((notification, index) => {
                    const targetUrl = getNotificationUrl(notification.url);

                    return (
                      <tr key={notification.id || `${notification.title}-${index}`}>
                        <td>
                          <Badge bg={notification.unread ? 'danger' : 'success'}>
                            {notification.unread ? 'Belum dibaca' : 'Sudah dibaca'}
                          </Badge>
                        </td>
                        <td>
                          <Stack gap={1}>
                            <strong>{notification.title}</strong>
                            <span className="text-muted">{notification.description}</span>
                          </Stack>
                        </td>
                        <td>{notification.time || '-'}</td>
                        <td className="text-end">
                          <Stack direction="horizontal" gap={2} className="justify-content-end">
                            {targetUrl && (
                              <Button as={Link} to={targetUrl} variant="light-primary" size="sm">
                                Lihat
                              </Button>
                            )}
                            <Button
                              variant="light-secondary"
                              size="sm"
                              disabled={!notification.unread || markingReadId === notification.id}
                              onClick={() => markNotificationAsRead(notification)}
                            >
                              Dibaca
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredNotifications.length}
              itemLabel="notifikasi"
            />
          </>
        )}
      </MainCard>
    </Stack>
  );
}
