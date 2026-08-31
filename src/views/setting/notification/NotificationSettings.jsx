import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

import LoaderButton from 'components/LoaderButton';
import LoaderData from 'components/LoaderData';
import MainCard from 'components/MainCard';
import NotificationSettingServices from '../../../services/setting/NotificationSettingServices';
import { useAlert } from '../../../utils/alertContext';

const initialSettings = { email: '', emailEnabled: true, telegramEnabled: false, telegramChatId: '' };

export default function NotificationSettings() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await NotificationSettingServices.getSettings();
        if (!response.data.success) throw new Error(response.data.message);
        const data = response.data.data;
        setSettings({
          email: data.email || '',
          emailEnabled: Boolean(data.email_enabled),
          telegramEnabled: Boolean(data.telegram_enabled),
          telegramChatId: data.telegram_chat_id || ''
        });
      } catch (error) {
        showAlert(error.response?.data?.message || error.message || 'Failed to load notification settings', 'danger');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [showAlert]);

  useEffect(() => {
    if (window.Telegram?.Login) return undefined;
    const script = document.createElement('script');
    script.id = 'telegram-login-widget-sdk';
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (!window.Telegram?.Login) script.remove();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await NotificationSettingServices.updateSettings({
        email_enabled: settings.emailEnabled,
        telegram_enabled: settings.telegramEnabled,
        telegram_chat_id: settings.telegramChatId || null
      });
      if (!response.data.success) throw new Error(response.data.message);
      showAlert('Notification settings saved successfully', 'success');
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || 'Failed to save notification settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTelegram = () => {
    const botId = import.meta.env.VITE_TELEGRAM_BOT_ID;
    if (!botId) {
      showAlert('VITE_TELEGRAM_BOT_ID is not configured.', 'danger');
      return;
    }
    if (!/^\d+$/.test(String(botId))) {
      showAlert('Telegram Bot ID must be numeric. Use the numeric ID from your bot token, not a connection ID.', 'danger');
      return;
    }
    if (!window.Telegram?.Login?.auth) {
      showAlert('Telegram Login is still loading. Please try again.', 'warning');
      return;
    }

    setConnectingTelegram(true);
    window.Telegram.Login.auth({ bot_id: Number(botId), request_access: 'write' }, async (telegramUser) => {
      if (!telegramUser?.id) {
        setConnectingTelegram(false);
        return;
      }

      const recipientName =
        [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Telegram';

      try {
        const response = await NotificationSettingServices.postConnectTelegram({
          telegram_chat_id: String(telegramUser.id),
          recipient_name: recipientName,
          chat_type: 'private',
          is_active: true
        });
        if (!response.data.success) throw new Error(response.data.message);

        setSettings((current) => ({
          ...current,
          telegramEnabled: true,
          telegramChatId: String(telegramUser.id)
        }));
        showAlert('Telegram connected successfully', 'success');
      } catch (error) {
        showAlert(error.response?.data?.message || error.message || 'Failed to connect Telegram', 'danger');
      } finally {
        setConnectingTelegram(false);
      }
    });
  };

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Notification Settings</h5>
          <span className="text-muted f-12">Choose how you want to receive account notifications.</span>
        </Stack>
      }
    >
      {loading ? (
        <LoaderData />
      ) : (
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col lg={6}>
              <Card className="border h-100 mb-0">
                <Card.Body>
                  <Stack direction="horizontal" className="justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">
                        <i className="ti ti-mail text-primary me-2" />
                        Email
                      </h6>
                      <small className="text-muted">Receive notifications through your registered email.</small>
                    </div>
                    <Form.Check
                      type="switch"
                      id="my-email-notification"
                      checked={settings.emailEnabled}
                      onChange={(event) => setSettings((current) => ({ ...current, emailEnabled: event.target.checked }))}
                    />
                  </Stack>
                  <div className="rounded bg-light p-3">
                    <small className="text-muted d-block">Account email</small>
                    <span className="fw-semibold">{settings.email || '-'}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="border h-100 mb-0">
                <Card.Body>
                  <Stack direction="horizontal" className="justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">
                        <i className="ti ti-brand-telegram text-info me-2" />
                        Telegram
                      </h6>
                      <small className="text-muted">Send notifications to a private or group Telegram chat.</small>
                    </div>
                    <Form.Check
                      type="switch"
                      id="my-telegram-notification"
                      checked={settings.telegramEnabled}
                      onChange={(event) => setSettings((current) => ({ ...current, telegramEnabled: event.target.checked }))}
                    />
                  </Stack>
                  <Stack direction="horizontal" className="justify-content-between rounded bg-light p-3">
                    <div>
                      <small className="text-muted d-block">Connection</small>
                      <span className="fw-semibold">{settings.telegramChatId ? 'Connected' : 'Not connected'}</span>
                    </div>
                    <Button type="button" variant="outline-info" disabled={connectingTelegram} onClick={handleConnectTelegram}>
                      {connectingTelegram ? (
                        <LoaderButton />
                      ) : (
                        <>
                          <i className="ti ti-link me-1" />
                          {settings.telegramChatId ? 'Reconnect' : 'Connect'}
                        </>
                      )}
                    </Button>
                  </Stack>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Stack direction="horizontal" className="justify-content-end mt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderButton />
              ) : (
                <>
                  <i className="ti ti-device-floppy me-1" />
                  Save Settings
                </>
              )}
            </Button>
          </Stack>
        </Form>
      )}
    </MainCard>
  );
}
