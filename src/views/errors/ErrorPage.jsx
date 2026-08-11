import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import SmestaLogo from 'assets/images/smesta_text_line.png';

import './error-page.scss';

const ERROR_CONTENT = {
  NETWORK: {
    icon: 'ti-wifi-off',
    displayStatus: 'OFFLINE',
    eyebrow: 'Connection interrupted',
    title: 'Oops, there is a network problem',
    description: 'Check your internet connection, then try loading the page again.'
  },
  400: {
    icon: 'ti-alert-triangle',
    eyebrow: 'Invalid request',
    title: 'Something is wrong with this request',
    description: 'Review the submitted data, then try again.'
  },
  401: {
    icon: 'ti-lock',
    eyebrow: 'Session required',
    title: 'Please sign in to continue',
    description: 'Your session could not be found or has expired.',
    actionLabel: 'Sign in again',
    actionHref: '/'
  },
  403: {
    icon: 'ti-shield-lock',
    eyebrow: 'Restricted access',
    title: 'You do not have access',
    description: 'Your account does not have permission to open this page.',
    actionLabel: 'Choose another system',
    actionHref: '/systems'
  },
  404: {
    icon: 'ti-map-search',
    eyebrow: 'Page not found',
    title: 'It looks like you are lost',
    description: 'The requested address is unavailable, has moved, or may have been entered incorrectly.'
  },
  408: {
    icon: 'ti-clock-pause',
    eyebrow: 'Request timed out',
    title: 'The server took too long to respond',
    description: 'Check your connection and try reloading the page.'
  },
  429: {
    icon: 'ti-hourglass',
    eyebrow: 'Too many requests',
    title: 'Please wait before trying again',
    description: 'Requests are temporarily limited to keep the service stable.'
  },
  500: {
    icon: 'ti-server-off',
    eyebrow: 'Server error',
    title: 'The system is experiencing a problem',
    description: 'Our team has been notified. Please try again in a few moments.'
  },
  502: {
    icon: 'ti-plug-off',
    eyebrow: 'Gateway error',
    title: 'The service cannot be reached',
    description: 'A supporting service returned an invalid response.'
  },
  503: {
    icon: 'ti-tool',
    eyebrow: 'Service unavailable',
    title: 'We are performing maintenance',
    description: 'The service will be available again as soon as possible. Thank you for your patience.'
  },
  504: {
    icon: 'ti-wifi-off',
    eyebrow: 'Gateway timeout',
    title: 'The service took too long to respond',
    description: 'The connection to a supporting service was interrupted. Please try again.'
  }
};

const joinBasePath = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || '/';
};

export const getErrorContent = (status) => ERROR_CONTENT[String(status).toUpperCase()] || ERROR_CONTENT[Number(status)] || ERROR_CONTENT[500];

export default function ErrorPage({
  status = 500,
  title,
  description,
  detail,
  actionLabel,
  actionHref,
  showPrimaryAction = true,
  showBackAction = true,
  showRetryAction,
  onRetry,
  isRetrying = false,
  retryLabel
}) {
  const content = getErrorContent(status);
  const displayStatus = content.displayStatus ?? status;
  const resolvedActionLabel = actionLabel ?? content.actionLabel ?? 'Back to home';
  const resolvedActionHref = actionHref ?? content.actionHref ?? '/';
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
  const shouldShowRetry = showRetryAction ?? (Number(status) >= 500 || [408, 429].includes(Number(status)));

  return (
    <main className="app-error-page">
      <div className="app-error-page__glow app-error-page__glow--one" />
      <div className="app-error-page__glow app-error-page__glow--two" />

      <section className="app-error-card" aria-labelledby="app-error-title">
        <img
          className="app-error-card__brand"
          src={SmestaLogo}
          alt="SMESTA"
        />

        <div className="app-error-card__visual" aria-hidden="true">
          <span className={`app-error-card__status ${String(displayStatus).length > 3 ? 'app-error-card__status--wide' : ''}`}>
            {displayStatus}
          </span>
          <span className="app-error-card__icon">
            <i className={`ti ${content.icon}`} />
          </span>
        </div>

        <p className="app-error-card__eyebrow">{content.eyebrow}</p>
        <h1 id="app-error-title">{title || content.title}</h1>
        <p className="app-error-card__description">{description || content.description}</p>

        {detail && (
          <div className="app-error-card__detail">
            <i className="ti ti-info-circle" aria-hidden="true" />
            <span>{detail}</span>
          </div>
        )}

        <div className="app-error-card__actions">
          {showPrimaryAction && (
            <Button variant="primary" href={joinBasePath(resolvedActionHref)}>
              <i className="ti ti-home me-2" aria-hidden="true" />
              {resolvedActionLabel}
            </Button>
          )}

          {shouldShowRetry && (
            <Button
              variant="outline-secondary"
              disabled={isRetrying}
              onClick={onRetry || (() => window.location.reload())}
            >
              <i className={`ti ${isRetrying ? 'ti-loader-2 app-error-card__spin' : 'ti-refresh'} me-2`} aria-hidden="true" />
              {isRetrying ? 'Checking connection...' : retryLabel || 'Reload'}
            </Button>
          )}

          {showBackAction && canGoBack && (
            <Button variant="link" className="app-error-card__back" onClick={() => window.history.back()}>
              <i className="ti ti-arrow-left me-2" aria-hidden="true" />
              Back
            </Button>
          )}
        </div>

        <p className="app-error-card__help">
          Still having trouble? Contact your administrator and include error code <strong>{status}</strong>.
        </p>
      </section>
    </main>
  );
}

ErrorPage.propTypes = {
  status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  description: PropTypes.string,
  detail: PropTypes.node,
  actionLabel: PropTypes.string,
  actionHref: PropTypes.string,
  showPrimaryAction: PropTypes.bool,
  showBackAction: PropTypes.bool,
  showRetryAction: PropTypes.bool,
  onRetry: PropTypes.func,
  isRetrying: PropTypes.bool,
  retryLabel: PropTypes.string
};
