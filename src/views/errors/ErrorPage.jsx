import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';

import './error-page.scss';

const ERROR_CONTENT = {
  NETWORK: {
    icon: 'ti-wifi-off',
    displayStatus: 'OFFLINE',
    eyebrow: 'Koneksi terputus',
    title: 'Ups, jaringan sedang bermasalah',
    description: 'Periksa koneksi internet Anda, lalu coba muat halaman kembali.'
  },
  400: {
    icon: 'ti-alert-triangle',
    eyebrow: 'Permintaan tidak valid',
    title: 'Ada yang keliru pada permintaan ini',
    description: 'Periksa kembali data yang dikirim, lalu coba sekali lagi.'
  },
  401: {
    icon: 'ti-lock',
    eyebrow: 'Sesi diperlukan',
    title: 'Silakan masuk untuk melanjutkan',
    description: 'Sesi Anda tidak ditemukan atau sudah berakhir.',
    actionLabel: 'Masuk kembali',
    actionHref: '/'
  },
  403: {
    icon: 'ti-shield-lock',
    eyebrow: 'Akses dibatasi',
    title: 'Anda tidak memiliki akses',
    description: 'Akun Anda belum memiliki izin untuk membuka halaman ini.',
    actionLabel: 'Pilih sistem lain',
    actionHref: '/systems'
  },
  404: {
    icon: 'ti-map-search',
    eyebrow: 'Halaman tidak ditemukan',
    title: 'Sepertinya Anda tersesat',
    description: 'Alamat yang dibuka tidak tersedia, sudah dipindahkan, atau mungkin salah ketik.'
  },
  408: {
    icon: 'ti-clock-pause',
    eyebrow: 'Waktu permintaan habis',
    title: 'Server terlalu lama merespons',
    description: 'Periksa koneksi Anda dan coba muat ulang halaman.'
  },
  429: {
    icon: 'ti-hourglass',
    eyebrow: 'Terlalu banyak permintaan',
    title: 'Tunggu sebentar sebelum mencoba lagi',
    description: 'Kami membatasi permintaan sementara untuk menjaga layanan tetap stabil.'
  },
  500: {
    icon: 'ti-server-off',
    eyebrow: 'Kesalahan server',
    title: 'Sistem sedang mengalami kendala',
    description: 'Tim kami telah diberi tahu. Silakan coba kembali dalam beberapa saat.'
  },
  502: {
    icon: 'ti-plug-off',
    eyebrow: 'Gateway bermasalah',
    title: 'Layanan belum dapat dihubungi',
    description: 'Salah satu layanan pendukung memberikan respons yang tidak valid.'
  },
  503: {
    icon: 'ti-tool',
    eyebrow: 'Layanan tidak tersedia',
    title: 'Kami sedang melakukan pemeliharaan',
    description: 'Layanan akan kembali tersedia sesegera mungkin. Terima kasih atas kesabaran Anda.'
  },
  504: {
    icon: 'ti-wifi-off',
    eyebrow: 'Gateway timeout',
    title: 'Layanan membutuhkan waktu terlalu lama',
    description: 'Koneksi ke layanan pendukung terputus. Silakan coba kembali.'
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
  const resolvedActionLabel = actionLabel ?? content.actionLabel ?? 'Kembali ke beranda';
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
          src={`${import.meta.env.BASE_URL}customer-portal-wordmark.png`}
          alt="SM Connect"
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
              {isRetrying ? 'Memeriksa koneksi...' : retryLabel || 'Muat ulang'}
            </Button>
          )}

          {showBackAction && canGoBack && (
            <Button variant="link" className="app-error-card__back" onClick={() => window.history.back()}>
              <i className="ti ti-arrow-left me-2" aria-hidden="true" />
              Kembali
            </Button>
          )}
        </div>

        <p className="app-error-card__help">
          Masih mengalami kendala? Hubungi administrator dan sertakan kode error <strong>{status}</strong>.
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
