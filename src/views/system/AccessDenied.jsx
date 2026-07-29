import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import ErrorPage from '../errors/ErrorPage';

export default function AccessDenied({ showSystemSelector = true }) {
  const { state } = useLocation();
  const requestedSystem = state?.requestedSystem;
  const requestedMenu = state?.requestedMenu;
  const noAvailableSystems = state?.noAvailableSystems;
  const target = requestedMenu ? `menu ${requestedMenu}` : requestedSystem ? `sistem ${requestedSystem}` : 'halaman tersebut';
  const detail = requestedSystem
    ? `Akun Anda belum diizinkan membuka ${target}. Hubungi administrator jika akses ini diperlukan.`
    : 'Hubungi administrator jika Anda merasa seharusnya memiliki akses. Izin dapat diatur melalui Setting → Access Control.';

  return (
    <ErrorPage
      status={403}
      description={`Anda tidak memiliki izin untuk membuka ${target}.`}
      detail={detail}
      actionLabel={showSystemSelector ? 'Pilih sistem tersedia' : 'Kembali ke beranda'}
      actionHref={showSystemSelector ? '/systems' : '/'}
      showPrimaryAction={!noAvailableSystems}
    />
  );
}

AccessDenied.propTypes = {
  showSystemSelector: PropTypes.bool
};
